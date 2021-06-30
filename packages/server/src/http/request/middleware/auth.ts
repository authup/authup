import {Request, Response, NextFunction} from "express";
import {
    AuthorizationHeaderValue,
    buildAuthorizationHeaderValue,
    parseAuthorizationHeaderValue
} from "@typescript-auth/core";

export type AuthMiddlewareOptions = {
    parseCookie?: (request: Request) => string | undefined,

    authenticateWithCookie?: (request: Request, value: unknown) => Promise<void>,
    authenticateWithAuthorizationHeader?: (request: Request, value: AuthorizationHeaderValue) => Promise<void>
}

export function setupAuthMiddleware(middlewareOptions: AuthMiddlewareOptions) {
    return async (request: Request, response: Response, next: NextFunction) => {
        let { authorization: headerValue } = request.headers;

        if(typeof middlewareOptions.parseCookie === 'function') {
            try {
                const cookie: unknown = middlewareOptions.parseCookie(request);

                if(typeof middlewareOptions.authenticateWithCookie === 'function') {
                    await middlewareOptions.authenticateWithCookie(request, cookie);
                    next();
                }

                // if authenticateWithCookie function not defined, try to use cookie string as bearer token.
                if(typeof cookie === 'string') {
                    headerValue = buildAuthorizationHeaderValue({type: "Bearer", token: cookie});
                }
            } catch (e) {
                // do nothing
            }
        }

        if(typeof headerValue !== 'string') {
            next();
        }

        const header = parseAuthorizationHeaderValue(headerValue);

        await middlewareOptions.authenticateWithAuthorizationHeader(request, header);
    }
}
