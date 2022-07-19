/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbilityManager, TokenAPI, TokenVerificationPayload } from '@authelion/common';
import { Socket, SocketNextFunction } from '../type';
import { SocketMiddlewareContext } from './type';
import { initTokenCache, verifyToken } from '../../utils';

export function setupSocketMiddleware(context: SocketMiddlewareContext) {
    const tokenCache = initTokenCache(context.redis, context.redisPrefix);
    const tokenAPIClient = new TokenAPI(context.http);

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
                logger: context.logger,
            });
        } catch (e) {
            return next(e);
        }

        switch (data.sub.kind) {
            case 'robot':
                socket.data.robotId = data.sub.entity.id;
                socket.data.robot = data.sub.entity;
                break;
            case 'user':
                socket.data.userId = data.sub.entity.id;
                socket.data.user = data.sub.entity;
                break;
        }

        socket.data.realmId = data.sub.entity.realm_id;
        socket.data.token = token;
        socket.data.permissions = data.sub.permissions;
        socket.data.ability = new AbilityManager(data.sub.permissions);

        return next();
    };
}
