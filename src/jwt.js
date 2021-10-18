import jwt from 'jsonwebtoken';

export function authorize(token, options) {
    const {
        secret = process.env.JWT_SECRET,
        ignoreExpiration = process.env.IGNORE_JWT_EXPIRATION || false
    } = options;

    const verifyOptions = {
        algorithms: ['HS256'],
        ignoreExpiration: ignoreExpiration || ignoreExpiration === 'true'
    };

    return jwt.verify(token, secret, verifyOptions);
}
