// Copyright 2021-2023 Ellucian Company L.P. and its affiliates.

import got from 'got';
import { StatusCodes } from 'http-status-codes';

import { getLogger } from './log.js';
const logger = getLogger();

const baseOptions = {
    headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache'
    }
};
const stringifiedBaseOptions = JSON.stringify(baseOptions);

function integrationUrl(options={}) {
    return options.ethosIntegrationUrl || process.env.ETHOS_INTEGRATION_URL;
}

function buildUrl({base = 'api', id, options, resource}) {
    let url;
    switch(base) {
        case 'admin':
        case 'api':
            url = `${integrationUrl(options)}/${base}/${resource}${id ? '/' + id : ''}`;
            url = `${integrationUrl(options)}/${base}/${resource}${id ? '/' + id : ''}`;
            break;
        case 'auth':
        case 'graphql':
            url = `${integrationUrl(options)}/${base}`;
            break;
        default:
            throw new Error(`Unknown base to buildUrl: ${base}`);
    }

    return url
}

function createNewRequestOptions({headers}={}) {
    const requestOptions = JSON.parse(stringifiedBaseOptions);
    logger.debug("createNewRequestOptions initiaze requestOptions:", requestOptions);
    if (headers) {
        // assign incoming headers first
        Object.assign( requestOptions.headers, headers);
        logger.debug("createNewRequestOptions after add custom header values requestOptions:", requestOptions);
    }
    logger.debug("createNewRequestOptions before return requestOptions:", requestOptions);
    return requestOptions;
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
        logger.debug('using cached token');
        return { context, token: cachedToken.token };
    }

    if (!apiKey) {
        throw new Error('getToken missing apiKey');
    }

    const requestOptions = createNewRequestOptions();
    addAuthorization(apiKey, requestOptions);

    const url = buildUrl({base: 'auth', options});

    logger.debug('requesting a new token');
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

export async function get({apiKey, base = 'api', context = {}, id, resource, searchParams = {}, token, options}) {
    if (!resource) {
        throw  new Error('get: missing resource name');
    }

    const { token: tokenToUse } = await getToken({apiKey, context, options, token});

    // if there is a searchParams.criteria that is not stringified, stringify it now
    if (searchParams.criteria && typeof searchParams.criteria !== 'string' ) {
        searchParams.criteria = JSON.stringify(searchParams.criteria);
    }

    if (tokenToUse) {
        const requestOptions = createNewRequestOptions({headers: options?.headers});
        logger.debug("get function requestOptions:", requestOptions);
        addAuthorization(tokenToUse, requestOptions);
        requestOptions.searchParams = searchParams;

        const url = buildUrl({base, id, options, resource});
        context.ethosGetCount = context.ethosGetCount ? context.ethosGetCount + 1 : 1;
        try {
            logger.debug('url', url);
            logger.debug('requestOptions', requestOptions);
            const response = await got.get(url, requestOptions);
            if (response.statusCode === StatusCodes.OK) {
                return {
                    context,
                    data: JSON.parse(response.body)
                }
            }

            logger.error(`Integration get failed. response status: ${response.statusCode}`);
            throw new Error(`Integration get failed. response status: ${response.statusCode}`);
        } catch (error) {
            logger.error('ethos get failed:', error);
            let errorResponseBody = {};
            if (error.response) {
                logger.error('!!! ethos get error response body:', error.response.body);
                errorResponseBody = error.response.body;
            }
            return {
                context,
                error,
                errorMsg: errorResponseBody
            }
        }
    } else {
        throw new Error('get failed to get a token');
    }
}

export async function graphql({apiKey, context = {}, options, query, token, variables}) {
    const { token: tokenToUse } = await getToken({apiKey, context, options, token});

    if (tokenToUse) {
        const requestOptions = createNewRequestOptions({headers: options?.headers});
        addAuthorization(tokenToUse, requestOptions);
        requestOptions.json = {
            query,
            variables
        };

        const url = buildUrl({base: 'graphql', options});
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

export async function post({apiKey, base = 'api', context = {}, data, id, resource, searchParams = {}, token, options}) {
    if (!resource) {
        throw  new Error('post: missing resource name');
    }

    const { token: tokenToUse } = await getToken({apiKey, context, options, token});

    // if there is a searchParams.criteria that is not stringified, stringify it now
    if (searchParams.criteria && typeof searchParams.criteria !== 'string' ) {
        searchParams.criteria = JSON.stringify(searchParams.criteria);
    }

    if (tokenToUse) {
        // const headers = Object.assign({}, options?.headers, { 'Content-Type': 'application/json'})
        // const requestOptions = createNewRequestOptions({headers});
        logger.debug ("post options", options);
        const headers = Object.assign({}, { 'Content-Type': 'application/json'}, options?.headers, )
        logger.debug ("post headers", headers);
        const requestOptions = createNewRequestOptions({headers});
        logger.debug ("post requestOptions", requestOptions);
        addAuthorization(tokenToUse, requestOptions);
        if (Object.keys(searchParams).length > 0) {
            requestOptions.searchParams = searchParams;
        }
        requestOptions.json = data;

        const url = buildUrl({base, id, options, resource});
        context.ethosPostCount = context.ethosPostCount ? context.ethosPostCount + 1 : 1;
        try {
            logger.debug('url', url);
            logger.debug('before got.post requestOptions', JSON.stringify(requestOptions, null, 2));
            const response = await got.post(url, requestOptions,);
            if (response.statusCode === StatusCodes.OK || response.statusCode === StatusCodes.CREATED) {
                return {
                    context,
                    data: JSON.parse(response.body)
                }
            }

            logger.error(`Integration post failed. response status: ${response.statusCode}`);
            throw new Error(`Integration post failed. response status: ${response.statusCode}`);
        } catch (error) {
            logger.error('ethos post failed:', error);
            let errorResponseBody = {};
            if (error.response) {
                logger.error('!!! ethos post error response body:', error.response.body);
                errorResponseBody = error.response.body;
            }
            return {
                context,
                error,
                errorMsg: errorResponseBody
            }
        }
    } else {
        throw new Error('post failed to get a token');
    }
}

export async function put({apiKey, base = 'api', context = {}, data, id, resource, searchParams = {}, token, options}) {
    if (!resource) {
        throw  new Error('put: missing resource name');
    }

    const { token: tokenToUse } = await getToken({apiKey, context, options, token});

    // if there is a searchParams.criteria that is not stringified, stringify it now
    if (searchParams.criteria && typeof searchParams.criteria !== 'string' ) {
        searchParams.criteria = JSON.stringify(searchParams.criteria);
    }

    if (tokenToUse) {
        logger.debug ("put options", options);
        const headers = Object.assign({}, { 'Content-Type': 'application/json'}, options?.headers, )
        logger.debug ("put headers", headers);
        const requestOptions = createNewRequestOptions({headers});
        addAuthorization(tokenToUse, requestOptions);
        if (Object.keys(searchParams).length > 0) {
            requestOptions.searchParams = searchParams;
        }
        requestOptions.json = data;

        const url = buildUrl({base, id, options, resource});
        context.ethosPutCount = context.ethosPutCount ? context.ethosPutCount + 1 : 1;
        try {
            logger.debug('url', url);
            logger.debug('requestOptions', JSON.stringify(requestOptions, null, 2));
            const response = await got.put(url, requestOptions);
            if (response.statusCode === StatusCodes.OK || response.statusCode === StatusCodes.CREATED) {
                return {
                    context,
                    data: JSON.parse(response.body)
                }
            }

            logger.error(`Integration put failed. response status: ${response.statusCode}`);
            throw new Error(`Integration put failed. response status: ${response.statusCode}`);
        } catch (error) {
            logger.error('ethos put failed:', error);
            let errorResponseBody = {};
            if (error.response) {
                logger.error('!!! ethos put error response body:', error.response.body);
                errorResponseBody = error.response.body;
            }
            return {
                context,
                error,
                errorMsg: errorResponseBody
            }
        }
    } else {
        throw new Error('put failed to get a token');
    }
}

export default {
    getToken,
    get,
    graphql,
    post,
    put
};
