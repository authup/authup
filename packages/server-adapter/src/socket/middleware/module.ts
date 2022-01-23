/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbilityManager, TokenAPI, TokenVerificationPayload } from '@typescript-auth/domains';
import { Socket, SocketNextFunction } from '../type';
import { SocketMiddlewareContext } from './type';
import { initTokenCache, verifyToken } from '../../utils';

export function setupSocketMiddleware(context: SocketMiddlewareContext) {
    const tokenCache = initTokenCache(context.redis, context.redisPrefix);
    const tokenAPIClient = new TokenAPI(context.axios);

    return async (socket: Socket, next: SocketNextFunction) => {
        const { token } = socket.handshake.auth;

        if (!token) {
            return next();
        }

        let data : TokenVerificationPayload | undefined;

        try {
            data = await verifyToken({
                token,
                tokenCache,
                tokenAPIClient,
            });
        } catch (e) {
            return next(e);
        }

        const { permissions, ...entity } = data.target.data;

        switch (data.target.type) {
            case 'robot':
                socket.data.robotId = entity.id;
                socket.data.robot = entity;
                break;
            case 'user':
                socket.data.userId = entity.id;
                socket.data.user = entity;
                break;
        }

        socket.data.token = token;
        socket.data.permissions = permissions;
        socket.data.ability = new AbilityManager(permissions);

        return next();
    };
}
