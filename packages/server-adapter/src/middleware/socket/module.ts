/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/common';
import {
    AbilityManager,
    TokenError,
} from '@authup/common';
import type { Socket, SocketMiddlewareContext, SocketNextFunction } from './type';
import type { TokenVerifyContext } from '../../oauth2';
import { applyOAuth2IntrospectionResponse, useOAuth2TokenCache, verifyOAuth2Token } from '../../oauth2';

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

            socket.data.ability = new AbilityManager();

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

        applyOAuth2IntrospectionResponse(socket.data, data);

        return next();
    };
}
