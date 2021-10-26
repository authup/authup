/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
        try {
            let {authorization: headerValue} = request.headers;

            if (typeof middlewareOptions.parseCookie === 'function') {
                const cookie: unknown = middlewareOptions.parseCookie(request);

                if (typeof middlewareOptions.authenticateWithCookie === 'function') {
                    await middlewareOptions.authenticateWithCookie(request, cookie);
                    next();
                    return;
                }

                // if authenticateWithCookie function not defined, try to use cookie string as bearer token.
                if (typeof cookie === 'string') {
                    headerValue = buildAuthorizationHeaderValue({type: "Bearer", token: cookie});
                }
            }

            if (typeof headerValue !== 'string') {
                next();
                return;
            }

            const header = parseAuthorizationHeaderValue(headerValue);

            if (typeof middlewareOptions.authenticateWithAuthorizationHeader === 'function') {
                await middlewareOptions.authenticateWithAuthorizationHeader(request, header);
            }

            next();
        } catch (e) {
            next(e);
        }
    }
}
