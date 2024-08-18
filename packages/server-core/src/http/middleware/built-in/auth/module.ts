/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseAuthorizationHeader, stringifyAuthorizationHeader } from 'hapic';
import { coreHandler, getRequestHostName } from 'routup';
import type {
    Request, Response, Router,
} from 'routup';
import type { SerializeOptions } from '@routup/basic/cookie';
import { unsetResponseCookie, useRequestCookie } from '@routup/basic/cookie';
import { CookieName } from '@authup/core-http-kit';
import { PermissionChecker } from '@authup/permitus';
import { useConfig } from '../../../../config';
import { setRequestEnv } from '../../../request';
import { verifyAuthorizationHeader } from './verify';

function parseRequestAccessTokenCookie(request: Request): string | undefined {
    return useRequestCookie(request, CookieName.ACCESS_TOKEN);
}

function unsetCookies(res: Response) {
    const config = useConfig();
    const cookieOptions : SerializeOptions = {};

    if (config.cookieDomain) {
        cookieOptions.domain = config.cookieDomain;
    } else {
        cookieOptions.domain = getRequestHostName(res.req, {
            trustProxy: true,
        });
    }

    unsetResponseCookie(res, CookieName.ACCESS_TOKEN, cookieOptions);
    unsetResponseCookie(res, CookieName.REFRESH_TOKEN, cookieOptions);
    unsetResponseCookie(res, CookieName.ACCESS_TOKEN_EXPIRE_DATE, cookieOptions);
}

export function registerAuthMiddleware(router: Router) {
    router.use(coreHandler(async (request, response, next) => {
        let { authorization: headerValue } = request.headers;

        setRequestEnv(request, 'permissionChecker', new PermissionChecker());

        try {
            if (typeof headerValue === 'undefined') {
                const cookie = parseRequestAccessTokenCookie(request);
                if (cookie) {
                    headerValue = stringifyAuthorizationHeader({
                        type: 'Bearer',
                        token: cookie,
                    });
                }
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
    }));
}
