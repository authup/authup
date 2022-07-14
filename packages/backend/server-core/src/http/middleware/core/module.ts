/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseAuthorizationHeader, stringifyAuthorizationHeader } from '@trapi/client';
import { CookieName } from '@authelion/common';
import path from 'path';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../../type';
import { verifyAuthorizationHeader } from './verify';
import { Config, useConfig } from '../../../config';

function parseRequestAccessTokenCookie(request: ExpressRequest): string | undefined {
    return typeof request.cookies?.[CookieName.ACCESS_TOKEN] === 'string' ?
        request.cookies?.[CookieName.ACCESS_TOKEN] :
        undefined;
}

function unsetCookies(res: ExpressResponse) {
    res.cookie(CookieName.ACCESS_TOKEN, null, { maxAge: 0 });
    res.cookie(CookieName.REFRESH_TOKEN, null, { maxAge: 0 });
    res.cookie(CookieName.ACCESS_TOKEN_EXPIRE_DATE, null, { maxAge: 0 });
}

export function createMiddleware() {
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

            await verifyAuthorizationHeader(request, header);

            next();
        } catch (e) {
            unsetCookies(response);
            next(e);
        }
    };
}
