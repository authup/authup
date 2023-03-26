/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/common';
import {
    CookieName,
} from '@authup/common';
import { BadRequestError } from '@ebec/http';
import { useRequestCookies } from '@routup/cookie';
import { parseAuthorizationHeader, stringifyAuthorizationHeader } from 'hapic';
import type {
    Handler, Next, Request, Response,
} from 'routup';
import { setRequestEnv } from 'routup';
import type { RequestEnv } from '../type';
import type { HTTPMiddlewareContext } from './type';
import type { TokenVerifyContext } from '../../oauth2';
import { applyOAuth2IntrospectionResponse, useOAuth2TokenCache, verifyOAuth2Token } from '../../oauth2';

export function setupHTTPMiddleware(context: HTTPMiddlewareContext) : Handler {
    const cache = useOAuth2TokenCache(context.redis, context.redisPrefix);

    const tokenVerifyContext : TokenVerifyContext = {
        ...context,
        cache,
    };

    return async (req: Request, res: Response, next: Next) => {
        let { authorization: headerValue } = req.headers;

        if (!headerValue) {
            const cookies = useRequestCookies(req);

            try {
                let value;
                if (context.cookieHandler) {
                    value = context.cookieHandler(cookies);
                } else if (
                    cookies[CookieName.ACCESS_TOKEN] &&
                        typeof cookies[CookieName.ACCESS_TOKEN] === 'string'
                ) {
                    value = cookies[CookieName.ACCESS_TOKEN];
                }

                if (value) {
                    headerValue = stringifyAuthorizationHeader({ type: 'Bearer', token: value });
                }
            } catch (e) {
                // ...
            }
        }

        if (!headerValue) {
            next();
            return;
        }

        const header = parseAuthorizationHeader(headerValue);

        if (header.type !== 'Bearer') {
            throw new BadRequestError('Only Bearer tokens are accepted as authentication method.');
        }

        let data : OAuth2TokenIntrospectionResponse | undefined;

        try {
            data = await verifyOAuth2Token(header.token, tokenVerifyContext);
        } catch (e) {
            next(e);

            return;
        }

        const env : Partial<RequestEnv> = {};

        applyOAuth2IntrospectionResponse(env, data);

        const keys = Object.keys(env);
        for (let i = 0; i < keys.length; i++) {
            setRequestEnv(req, keys[i], env[keys[i]]);
        }

        next();
    };
}
