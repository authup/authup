/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '@typescript-error/http';
import { AuthorizationHeader, parseAuthorizationHeader, stringifyAuthorizationHeader } from '@trapi/client';
import { ErrorCode, TokenError } from '@typescript-auth/domains';
import { ExpressRequest } from '../../type';
import { verifyClientForMiddlewareRequest, verifyUserForMiddlewareRequest } from './entity';
import { AuthMiddlewareOptions } from './type';

export function setupAuthMiddleware(context: AuthMiddlewareOptions) {
    return async (request: Request, response: Response, next: NextFunction) => {
        let { authorization: headerValue } = request.headers;

        try {
            if (typeof context.parseCookie === 'function') {
                const cookie: unknown = context.parseCookie(request);

                if (typeof context.authenticateWithCookie === 'function') {
                    await context.authenticateWithCookie(request, cookie);
                    next();
                    return;
                }

                // if authenticateWithCookie function not defined, try to use cookie string as bearer token.
                if (typeof cookie === 'string') {
                    headerValue = stringifyAuthorizationHeader({ type: 'Bearer', token: cookie });
                }
            }

            if (typeof headerValue !== 'string') {
                next();
                return;
            }

            const header = parseAuthorizationHeader(headerValue);

            if (typeof context.authenticateWithAuthorizationHeader === 'function') {
                await context.authenticateWithAuthorizationHeader(request, header);
            }

            next();
        } catch (e) {
            next(e);
        }
    };
}

export async function authenticateWithAuthorizationHeader(
    request: ExpressRequest,
    value: AuthorizationHeader,
    options: {
        writableDirectoryPath: string
    },
): Promise<void> {
    try {
        await verifyUserForMiddlewareRequest(request, value, options);
    } catch (e) {
        if (
            e instanceof NotFoundError ||
            (e instanceof TokenError && e.getOption('code') === ErrorCode.TOKEN_SUB_KIND_INVALID)
        ) {
            await verifyClientForMiddlewareRequest(request, value, options);
        } else {
            throw e;
        }
    }
}

export function parseCookie(request: any): string | undefined {
    try {
        if (typeof request.cookies?.auth_token !== 'undefined') {
            const { access_token: accessToken } = JSON.parse(request.cookies?.auth_token);

            return accessToken;
        }
    } catch (e) {
        // don't handle error, this is just fine :)
    }

    return undefined;
}
