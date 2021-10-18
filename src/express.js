import { StatusCodes } from 'http-status-codes';
import { authorize } from './jwt.js';

export function jwtAuthorize({options}) {
    return function (request, response, next) {
        const { headers: { authorization: lowerAuthorization, Authorization: upperAuthorization } = {} } = request;

        const authorization = lowerAuthorization || upperAuthorization || '';

        // eslint-disable-next-line no-unused-vars
        const [bearer, authorizationToken] = authorization.split(' ');

        if (bearer !== 'Bearer' || !authorizationToken) {
            const message = 'missing Authorization Bearer token';
            console.error(message);
            response.status(StatusCodes.FORBIDDEN).send(JSON.stringify({ message }));
            next(message);
        }

        try {
            const decodedJwt = authorize(authorizationToken, options);

            request.jwt = decodedJwt;
            next();
        } catch (error) {
            const message = `Authorization token failed: ${error.message}`;
            console.error(message);
            response.set('Content-Type', 'application/json')
            response.status(StatusCodes.FORBIDDEN).send(JSON.stringify({error: message}));
            next(error);
        }
    }
}
