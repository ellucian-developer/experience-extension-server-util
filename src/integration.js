import got from 'got';
import { StatusCodes } from 'http-status-codes';

const baseOptions = {
    headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache'
    }
};

function integrationUrl(options={}) {
    return options.ethosIntegrationUrl || process.env.ETHOS_INTEGRATION_URL;
}

function buildUrl(path, options) {
    return `${integrationUrl(options)}/${path}`;
}

function buildResourceUrl({id, options, resource}) {
    return `${integrationUrl(options)}/api/${resource}${id ? '/' + id : ''}`;
}

function createNewOptions() {
    return Object.assign({}, baseOptions);
}

function addAuthorization(token, options) {
    options.headers.Authorization = `Bearer ${token}`;
}

export async function getToken({apiKey, context={}, options, token}) {
    if (token) {
        return { context, token };
    }

    // use cached token if not likely expired
    const now = new Date().getTime();
    if (!context.tokensByApiKey) {
        context.tokensByApiKey = {};
    }
    const cachedToken = context.tokensByApiKey[apiKey];
    if (cachedToken && cachedToken.expires - (30 * 1000) > now) {
        if (process.env.DEBUG === 'true') {
            console.log('using cached token');
        }
        return { context, token: cachedToken.token };
    }

    if (!apiKey) {
        throw new Error('getToken missing apiKey');
    }

    const requestOptions = createNewOptions();
    addAuthorization(apiKey, requestOptions);

    const url = buildUrl('auth', options);

    if (process.env.DEBUG === 'true') {
        console.log('requesting a new token');
    }
    const response = await got.post(url, requestOptions);
    if (response.statusCode === StatusCodes.OK) {
        const token = response.body;
        // we could decode to get the exact expire, but Ethos currently uses 5 minute expirations
        const expires = now + (5 * 60 * 1000);
        context.tokensByApiKey[apiKey] = {
            expires,
            token
        };

        return { context, token };
    }

    throw new Error(`Integration Auth failed. response status: ${response.statusCode}`);
}

export async function get({apiKey, context = {}, id, resource, searchParams = {}, token, options}) {
    if (!resource) {
        throw  new Error('get: missing resource name');
    }

    const { token: tokenToUse } = await getToken({apiKey, context, options, token});

    // if there is a searchParams.criteria that is not stringified, stringify it now
    if (searchParams.criteria && typeof searchParams.criteria !== 'string' ) {
        searchParams.criteria = JSON.stringify(searchParams.criteria);
    }

    if (tokenToUse) {
        const requestOptions = createNewOptions();
        addAuthorization(tokenToUse, requestOptions);
        requestOptions.searchParams = searchParams;

        const url = buildResourceUrl({id, options, resource});
        context.ethosGetCount = context.ethosGetCount ? context.ethosGetCount + 1 : 1;
        const response = await got.get(url, requestOptions);
        if (response.statusCode === StatusCodes.OK) {
            return {
                context,
                data: JSON.parse(response.body)
            }
        }

        throw new Error(`Integration get failed. response status: ${response.statusCode}`);
    } else {
        throw new Error('get failed to get a token');
    }
}

export async function graphql({apiKey, context = {}, options, query, token, variables}) {
    const { token: tokenToUse } = await getToken({apiKey, context, options, token});

    if (tokenToUse) {
        const requestOptions = createNewOptions();
        addAuthorization(tokenToUse, requestOptions);
        requestOptions.json = {
            query,
            variables
        };

        const url = buildUrl('graphql', options);
        context.ethosGraphQLCount = context.ethosGraphQLCount ? context.ethosGraphQLCount + 1 : 1;
        const response = await got.post(url, requestOptions);
        if (response.statusCode === StatusCodes.OK) {
            return { context, ...JSON.parse(response.body) };
        }

        throw new Error(`Integration GraphQL failed. response status: ${response.statusCode}`);
    } else {
        throw new Error('grapql failed to get a token');
    }
}

export default {
    getToken,
    get,
    graphql
};
