// Copyright 2021-2023 Ellucian Company L.P. and its affiliates.

import { StatusCodes } from 'http-status-codes';
import { authorize } from './jwt.js';

export function jwtAuthorizeMiddy({options: opts = {}}) {
    const options = {...opts};

    function before(request) {
        const {
            event: {
                headers: {
                    authorization = ''
                } = {}
            }
        } = request;

        const [bearer, authorizationToken] = authorization.split(' ');

        if (bearer !== 'Bearer' || !authorizationToken) {
            const message = 'missing Authorization Bearer token';
            const throwError = new Error(JSON.stringify({ error: {message}}));
            throwError.statusCode = StatusCodes.FORBIDDEN;
            throw throwError;
        }

        try {
            const decodedJwt = authorize(authorizationToken, options);
            request.event.jwt = decodedJwt;
        } catch (error) {
            const message = `Authorization token failed: ${error.message}`;
            const throwError = new Error(JSON.stringify({ error: {message}}));
            throwError.statusCode = StatusCodes.FORBIDDEN;

            throw throwError;
        }
    }

    return {
        before
    }
}

const contentTypeJsonHeader = {'Content-Type': 'application/json'}

export const buildResponse = ({ statusCode, headers = {}, body }) => {
    const response = {
        statusCode: statusCode,
        headers: { ...contentTypeJsonHeader, ...headers }
    }

    if (body) {
        response.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return response
}
