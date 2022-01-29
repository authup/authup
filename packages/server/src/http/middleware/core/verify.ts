/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    AuthHeaderTypeUnsupported,
    OAuth2TokenKind,
    OAuth2TokenSubKind,
    PermissionItem,
    TokenError,
} from '@typescript-auth/domains';
import { AuthorizationHeader, AuthorizationHeaderType } from '@trapi/client';
import { Client } from 'redis-extension';
import { getCustomRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest } from '../../type';
import { extendOAuth2TokenVerification, verifyOAuth2Token } from '../../oauth2';
import {
    RobotEntity, UserEntity, UserRepository,
} from '../../../domains';

export async function verifyAuthorizationHeader(
    request: ExpressRequest,
    header: AuthorizationHeader,
    options: {
        writableDirectoryPath: string,
        redis?: Client | string | boolean
    },
) : Promise<void> {
    const userRepository = getCustomRepository<UserRepository>(UserRepository);

    let permissions : PermissionItem[] = [];

    if (header.type !== AuthorizationHeaderType.BEARER) {
        if (
            process.env.NODE_ENV === 'test' &&
            header.type === 'Basic' &&
            header.username === 'admin' &&
            header.password === 'start123'
        ) {
            const entity = await userRepository.findOne({
                name: 'admin',
            });

            if (typeof entity === 'undefined') {
                throw new NotFoundError();
            }

            permissions = await userRepository.getOwnedPermissions(entity.id);

            request.user = entity;
            request.userId = entity.id;
            request.realmId = entity.realm_id;
            request.ability = new AbilityManager(permissions);

            return;
        }

        throw new AuthHeaderTypeUnsupported(header.type);
    }

    const token = await verifyOAuth2Token(
        header.token,
        {
            keyPairOptions: {
                directory: options.writableDirectoryPath,
            },
            redis: options.redis,
        },
    );

    if (token.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    request.token = header.token;
    request.realmId = token.entity.realm_id;

    const tokenExtended = await extendOAuth2TokenVerification(token, { redis: options.redis });

    request.ability = new AbilityManager(tokenExtended.target.permissions);

    switch (tokenExtended.target.kind) {
        case OAuth2TokenSubKind.USER: {
            request.user = tokenExtended.target.entity as UserEntity;
            request.userId = tokenExtended.target.entity.id;
            break;
        }
        case OAuth2TokenSubKind.ROBOT: {
            request.robot = tokenExtended.target.entity as RobotEntity;
            request.robotId = tokenExtended.target.entity.id;
            request.userId = tokenExtended.target.entity.user_id;
            break;
        }
    }
}
