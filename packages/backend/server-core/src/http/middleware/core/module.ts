/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseAuthorizationHeader, stringifyAuthorizationHeader } from 'hapic';
import { Request, Response, Next } from 'routup';
import { useRequestCookie, unsetResponseCookie } from '@routup/cookie';
import { AbilityManager, CookieName } from '@authelion/common';
import { setRequestEnv } from '../../utils';
import { verifyAuthorizationHeader } from './verify';

function parseRequestAccessTokenCookie(request: Request): string | undefined {
    return useRequestCookie(request, CookieName.ACCESS_TOKEN);
}

function unsetCookies(res: Response) {
    unsetResponseCookie(res, CookieName.ACCESS_TOKEN);
    unsetResponseCookie(res, CookieName.REFRESH_TOKEN);
    unsetResponseCookie(res, CookieName.ACCESS_TOKEN_EXPIRE_DATE);
}

export function createMiddleware() {
    return async (request: Request, response: Response, next: Next) => {
        let { authorization: headerValue } = request.headers;

        setRequestEnv(request, 'ability', new AbilityManager());

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

            await verifyAuthorizationHeader(request, header);

            next();
        } catch (e) {
            unsetCookies(response);
            next(e);
        }
    };
}
