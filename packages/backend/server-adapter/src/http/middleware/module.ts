/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    CookieName,
    TokenAPI,
    TokenVerificationPayload,
} from '@authelion/common';
import { BadRequestError } from '@typescript-error/http';
import { parseAuthorizationHeader, stringifyAuthorizationHeader } from '@trapi/client';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../type';
import { HTTPMiddlewareContext } from './type';
import { initTokenCache, verifyToken } from '../../utils';

export function setupHTTPMiddleware(context: HTTPMiddlewareContext) {
    const tokenCache = initTokenCache(context.redis, context.redisPrefix);
    const tokenAPIClient = new TokenAPI(context.http);

    return async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        let { authorization: headerValue } = req.headers;

        if (!headerValue) {
            try {
                let value;
                if (context.cookieHandler) {
                    value = context.cookieHandler(req.cookies);
                } else if (
                    req.cookies?.[CookieName.ACCESS_TOKEN] &&
                        typeof req.cookies[CookieName.ACCESS_TOKEN] === 'string'
                ) {
                    value = req.cookies[CookieName.ACCESS_TOKEN];
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

        let data : TokenVerificationPayload | undefined;

        try {
            data = await verifyToken({
                token: header.token,
                tokenCache,
                tokenAPIClient,
                logger: context.logger,
            });
        } catch (e) {
            next(e);

            return;
        }

        switch (data.sub.kind) {
            case 'robot':
                req.robotId = data.sub.entity.id;
                req.robot = data.sub.entity;
                break;
            case 'user':
                req.userId = data.sub.entity.id;
                req.user = data.sub.entity;
                break;
        }

        req.realmId = data.sub.entity.realm_id;
        req.token = header.token;
        req.permissions = data.sub.permissions;
        req.ability = new AbilityManager(data.sub.permissions);

        next();
    };
}
