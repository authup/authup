/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseAuthorizationHeader, stringifyAuthorizationHeader } from '@trapi/client';
import { CookieName, OAuth2TokenKind } from '@typescript-auth/domains';
import {
    Cache, Client, setConfig, useClient,
} from 'redis-extension';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../../type';
import { AuthMiddlewareOptions } from './type';
import { verifyAuthorizationHeader } from './verify';

function parseRequestAccessTokenCookie(request: ExpressRequest): string | undefined {
    return typeof request.cookies?.[CookieName.ACCESS_TOKEN] === 'string' ?
        request.cookies?.[CookieName.ACCESS_TOKEN] :
        undefined;
}

export function setupMiddleware(context: AuthMiddlewareOptions) {
    let tokenCache : Cache<string> | undefined;

    if (context.redis) {
        let client : Client;

        if (typeof context.redis === 'string') {
            setConfig({
                connectionString: context.redis,
            });

            context.redis = true;
        }

        if (typeof context.redis === 'boolean') {
            client = useClient();
        } else {
            client = context.redis;
        }

        tokenCache = new Cache<string>({
            redis: client,
        }, {
            prefix: OAuth2TokenKind.ACCESS,
        });
    }

    return async (request: ExpressRequest, response: ExpressResponse, next: ExpressNextFunction) => {
        let { authorization: headerValue } = request.headers;

        try {
            const cookie = parseRequestAccessTokenCookie(request);

            if (cookie) {
                headerValue = stringifyAuthorizationHeader({ type: 'Bearer', token: cookie });
            }

            if (typeof headerValue !== 'string') {
                next();
                return;
            }

            const header = parseAuthorizationHeader(headerValue);

            const writableDirectoryPath = context.writableDirectoryPath || process.cwd();

            await verifyAuthorizationHeader(request, header, {
                writableDirectoryPath,
                tokenCache,
            });

            next();
        } catch (e) {
            next(e);
        }
    };
}
