/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/common';
import {
    AbilityManager,
    OAuth2SubKind, TokenError,
} from '@authup/common';
import type { Socket, SocketMiddlewareContext, SocketNextFunction } from './type';
import type { TokenVerifyContext } from '../../oauth2';
import { useOAuth2TokenCache, verifyOAuth2Token } from '../../oauth2';

export function setupSocketMiddleware(context: SocketMiddlewareContext) {
    const cache = useOAuth2TokenCache(context.redis, context.redisPrefix);

    const tokenVerifyContext : TokenVerifyContext = {
        ...context,
        cache,
    };

    return async (socket: Socket, next: SocketNextFunction) => {
        const { token } = socket.handshake.auth;

        if (!token) {
            if (context.logger) {
                context.logger.debug('No token is present.');
            }
            return next();
        }

        let data : OAuth2TokenIntrospectionResponse | undefined;

        try {
            data = await verifyOAuth2Token(token, tokenVerifyContext);
        } catch (e) {
            if (!(e instanceof TokenError)) {
                context.logger.warn('Token verification was not possible', {
                    error: e.message,
                });
            }

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
        socket.data.realmName = data.realm_name;
        socket.data.token = token;
        socket.data.permissions = data.permissions;
        socket.data.ability = new AbilityManager(data.permissions);

        return next();
    };
}
