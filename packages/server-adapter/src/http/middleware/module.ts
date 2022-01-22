/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager, Robot, TokenAPI,
    TokenVerificationPayload, User,
} from '@typescript-auth/domains';
import { BadRequestError } from '@typescript-error/http';
import { parseAuthorizationHeader, stringifyAuthorizationHeader } from '@trapi/client';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../type';
import { HTTPMiddlewareContext } from './type';
import { initTokenCache, verifyToken } from '../../utils';

export function setupHTTPMiddleware(context: HTTPMiddlewareContext) {
    const tokenCache = initTokenCache(context.redis, context.redisPrefix);
    const tokenAPIClient = new TokenAPI(context.axios);

    const cookieHandler = (cookies: any) => {
        if (cookies?.auth_token) {
            const { access_token: accessToken } = JSON.parse(cookies?.auth_token);
            return accessToken;
        }

        return undefined;
    };

    return async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        let { authorization: headerValue } = req.headers;

        if (!headerValue) {
            try {
                let value;
                if (context.cookieHandler) {
                    value = context.cookieHandler(req.cookies);
                } else {
                    value = cookieHandler(req.cookies);
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
            });
        } catch (e) {
            next(e);

            return;
        }

        const { permissions, ...entity } = data.entity.data;

        switch (data.entity.type) {
            case 'robot':
                req.robotId = entity.id as Robot['id'];
                req.robot = entity as Robot;
                break;
            case 'user':
                req.userId = entity.id as User['id'];
                req.user = entity as User;
                break;
        }

        req.token = header.token;
        req.permissions = permissions;
        req.ability = new AbilityManager(permissions);

        next();
    };
}
