/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager, OAuth2API, OAuth2SubKind, OAuth2TokenIntrospectionResponse,
} from '@authelion/common';
import { Socket, SocketNextFunction } from '../type';
import { SocketMiddlewareContext } from './type';
import { initTokenCache, verifyToken } from '../../utils';

export function setupSocketMiddleware(context: SocketMiddlewareContext) {
    const tokenCache = initTokenCache(context.redis, context.redisPrefix);
    const tokenAPIClient = new OAuth2API(context.http);

    return async (socket: Socket, next: SocketNextFunction) => {
        const { token } = socket.handshake.auth;

        if (!token) {
            return next();
        }

        let data : OAuth2TokenIntrospectionResponse | undefined;

        try {
            data = await verifyToken({
                token,
                tokenCache,
                tokenAPIClient,
                logger: context.logger,
            });
        } catch (e) {
            return next(e);
        }

        switch (data.sub_kind) {
            case OAuth2SubKind.CLIENT:
                socket.data.clientId = data.sub;
                break;
            case OAuth2SubKind.ROBOT:
                socket.data.robotId = data.sub;
                break;
            case OAuth2SubKind.USER:
                socket.data.userId = data.sub;
                break;
        }

        socket.data.realmId = data.realm_id;
        socket.data.token = token;
        socket.data.permissions = data.permissions;
        socket.data.ability = new AbilityManager(data.permissions);

        return next();
    };
}
