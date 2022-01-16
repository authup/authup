/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RedisCache, useRedisInstance } from 'redis-extension';
import { AbilityManager } from '@typescript-auth/core';
import { TokenAPI, TokenVerificationPayload } from '@typescript-auth/domains';
import { Socket, SocketNextFunction } from '../type';
import { SocketMiddlewareContext } from './type';
import { verifyToken } from '../../utils';

export function setupSocketMiddleware(context: SocketMiddlewareContext) {
    let tokenCache : RedisCache<string>;

    if (context.redis) {
        const redis = typeof context.redis === 'boolean' ?
            useRedisInstance('default') :
            context.redis;

        tokenCache = new RedisCache<string>({
            redis: context.redis,
        }, {
            prefix: context.redisPrefix || 'token',
        });

        tokenCache.startScheduler();
    }

    const apiClient = new TokenAPI(context.axios);

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
                tokenAPIClient: apiClient,
            });
        } catch (e) {
            return next(e);
        }

        const { permissions, ...entity } = data.entity.data;

        switch (data.entity.type) {
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
