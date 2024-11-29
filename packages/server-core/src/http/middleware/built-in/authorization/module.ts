/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseAuthorizationHeader, stringifyAuthorizationHeader } from 'hapic';
import { coreHandler, getRequestHostName } from 'routup';
import type { Router } from 'routup';
import { type SerializeOptions, unsetResponseCookie, useRequestCookie } from '@routup/basic/cookie';
import { CookieName } from '@authup/core-http-kit';
import { PermissionChecker } from '@authup/security';
import { useConfig } from '../../../../config';
import { useDataSourceSync } from '../../../../database';
import { PermissionDBProvider, PolicyEngine } from '../../../../security';
import { RequestPermissionChecker, setRequestPermissionChecker } from '../../../request';
import { verifyAuthorizationHeader } from './verify';

export function registerAuthorizationMiddleware(router: Router) {
    router.use(coreHandler(async (request, response, next) => {
        const dataSource = useDataSourceSync();
        const permissionProvider = new PermissionDBProvider(dataSource);
        const permissionChecker = new PermissionChecker({
            provider: permissionProvider,
            policyEngine: new PolicyEngine(),
        });

        const requestPermissionChecker = new RequestPermissionChecker(request, permissionChecker);
        setRequestPermissionChecker(request, requestPermissionChecker);

        let { authorization: headerValue } = request.headers;

        try {
            if (typeof headerValue === 'undefined') {
                const cookie = useRequestCookie(request, CookieName.ACCESS_TOKEN);
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
            const config = useConfig();
            const cookieOptions : SerializeOptions = {};

            if (config.cookieDomain) {
                cookieOptions.domain = config.cookieDomain;
            } else {
                cookieOptions.domain = getRequestHostName(response.req, {
                    trustProxy: true,
                });
            }

            unsetResponseCookie(response, CookieName.ACCESS_TOKEN, cookieOptions);
            unsetResponseCookie(response, CookieName.REFRESH_TOKEN, cookieOptions);
            unsetResponseCookie(response, CookieName.ACCESS_TOKEN_EXPIRE_DATE, cookieOptions);

            next(e);
        }
    }));
}
