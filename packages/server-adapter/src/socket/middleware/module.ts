/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    OAuth2SubKind,
    OAuth2TokenIntrospectionResponse,
} from '@authup/common';
import { Socket, SocketNextFunction } from '../type';
import { SocketMiddlewareContext } from './type';
import { useOAuth2TokenCache, verifyOAuth2Token } from '../../oauth2';

export function setupSocketMiddleware(context: SocketMiddlewareContext) {
    const tokenCache = useOAuth2TokenCache(context.redis, context.redisPrefix);

    return async (socket: Socket, next: SocketNextFunction) => {
        const { token } = socket.handshake.auth;

        if (!token) {
            return next();
        }

        let data : OAuth2TokenIntrospectionResponse | undefined;

        try {
            data = await verifyOAuth2Token(token, context);
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
