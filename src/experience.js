import got from 'got';
import { StatusCodes } from 'http-status-codes';

const baseOptions = {
    responseType: 'json',
    throwHttpErrors: false,
    headers: {
        Accept: 'application/json',
    }
};

export async function getCardServerConfiguration({ jwt, token,  url, }) {
    const configUrl = url || jwt?.card?.cardServerConfigurationApiUrl;

    if (!configUrl) {
        throw new Error('getCardServerConfiguration url or Experience jwt is required');
    }

    // get card server configuration, which should have the apiKey
    const options = { ...baseOptions };
    options.headers.Authorization = `Bearer ${token}`;

    if (process.env.DEBUG === 'true') {
        console.debug('getCardServerConfiguration url:', configUrl);
    }

    const response = await got.get(configUrl, options);
    if (response.statusCode === StatusCodes.OK) {
        const { body: config } = response;

        if (process.env.DEBUG === 'true') {
            const logConfig = {...config};
            for (const key in logConfig) {
                if (key.toLocaleLowerCase().endsWith('key')) {
                    logConfig[key] = '*****';
                }
            }
            console.debug('getCardServerConfiguration configuration:', logConfig);
        }
        return {config};
    } else {
        return {
            error: {
                message: `failed to get card configuration status: ${response.statusCode}`,
                statusCode: response.statusCode
            }
        }
    }
}
