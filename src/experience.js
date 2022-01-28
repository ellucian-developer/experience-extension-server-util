// Copyright 2021-2022 Ellucian Company L.P. and its affiliates.

import got from 'got';
import { StatusCodes } from 'http-status-codes';

import { getLogger } from './log.js';
const logger = getLogger();

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

    logger.debug('getCardServerConfiguration url:', configUrl);

    const response = await got.get(configUrl, options);
    if (response.statusCode === StatusCodes.OK) {
        const { body: config } = response;

        if (logger.getLevel() <= logger.levels.DEBUG) {
            const logConfig = {...config};
            for (const key in logConfig) {
                if (key.toLocaleLowerCase().endsWith('key')) {
                    logConfig[key] = '*****';
                }
            }
            logger.debug('getCardServerConfiguration configuration:', logConfig);
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
