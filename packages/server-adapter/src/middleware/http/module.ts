/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    CookieName,
} from '@authup/core';
import { BadRequestError } from '@ebec/http';
import { useRequestCookies } from '@routup/cookie';
import { parseAuthorizationHeader, stringifyAuthorizationHeader } from 'hapic';
import type {
    Handler, Next, Request, Response,
} from 'routup';
import { setRequestEnv } from 'routup';
import type { TokenVerifierOutput } from '../../verifier';
import { TokenVerifier } from '../../verifier';
import type { HTTPMiddlewareContext } from './type';

export function setupHTTPMiddleware(context: HTTPMiddlewareContext) : Handler {
    const tokenVerifier = new TokenVerifier(context.tokenVerifier);

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
            setRequestEnv(req, 'ability', new AbilityManager());

            next();
            return;
        }

        const header = parseAuthorizationHeader(headerValue);

        if (header.type !== 'Bearer') {
            throw new BadRequestError('Only Bearer tokens are accepted as authentication method.');
        }

        let data : TokenVerifierOutput | undefined;

        try {
            data = await tokenVerifier.verify(header.token);
        } catch (e) {
            next(e);

            return;
        }

        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            setRequestEnv(req, keys[i], data[keys[i]]);
        }

        next();
    };
}
