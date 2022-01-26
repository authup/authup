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
    OAuth2TokenSubKind, PermissionItem,
    TokenError,
} from '@typescript-auth/domains';
import { AuthorizationHeader, AuthorizationHeaderType } from '@trapi/client';
import { Cache } from 'redis-extension';
import { getCustomRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest } from '../../type';
import { verifyOAuth2Token } from '../../oauth2';
import { RobotRepository, UserRepository } from '../../../domains';

export async function verifyAuthorizationHeader(
    request: ExpressRequest,
    header: AuthorizationHeader,
    options: {
        writableDirectoryPath: string,
        tokenCache?: Cache<string>
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
            tokenCache: options.tokenCache,
        },
    );

    if (token.kind !== OAuth2TokenKind.ACCESS) {
        throw TokenError.accessTokenRequired();
    }

    request.realmId = token.entity.realm_id;

    switch (token.payload.sub_kind) {
        case OAuth2TokenSubKind.USER: {
            const entity = await userRepository.findOne(token.entity.user_id);

            if (typeof entity === 'undefined') {
                throw new NotFoundError();
            }

            request.user = entity;
            request.userId = entity.id;

            permissions = await userRepository.getOwnedPermissions(token.entity.user_id);
            break;
        }
        case OAuth2TokenSubKind.ROBOT: {
            const repository = getCustomRepository<RobotRepository>(RobotRepository);
            const entity = await repository.findOne(token.entity.robot_id);

            if (typeof entity === 'undefined') {
                throw new NotFoundError();
            }

            if (entity.user_id) {
                permissions = await userRepository.getOwnedPermissions(entity.user_id);
            } else {
                permissions = await repository.getOwnedPermissions(entity.id);
            }

            request.userId = entity.user_id;
            request.robot = entity;
            request.robotId = entity.id;
            break;
        }
    }

    if (header.type === AuthorizationHeaderType.BEARER) {
        request.token = header.token;
    }

    request.ability = new AbilityManager(permissions);
}
