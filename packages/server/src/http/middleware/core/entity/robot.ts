/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    AuthHeaderTypeUnsupported,
    CredentialsInvalidError, OAuth2AccessTokenPayload, OAuth2AccessTokenSubKind,
    PermissionItem, Robot, TokenInvalidError, TokenSubKindInvalidError,
} from '@typescript-auth/domains';
import { getCustomRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { AuthorizationHeader, AuthorizationHeaderType } from '@trapi/client';
import { ExpressRequest } from '../../../type';
import { RobotRepository, UserRepository } from '../../../../domains';
import { verifyToken } from '../../../../utils';

export async function verifyClientForMiddlewareRequest(
    request: ExpressRequest,
    header: AuthorizationHeader,
    options: {
        writableDirectoryPath: string
    },
) : Promise<Robot> {
    const condition : Partial<Robot> = {};

    switch (header.type) {
        case AuthorizationHeaderType.BASIC: {
            condition.id = header.username;
            break;
        }
        case AuthorizationHeaderType.BEARER: {
            let tokenPayload : OAuth2AccessTokenPayload;

            try {
                tokenPayload = await verifyToken(header.token, {
                    directory: options.writableDirectoryPath,
                });
            } catch (e) {
                throw new TokenInvalidError();
            }

            if (tokenPayload.sub_kind === OAuth2AccessTokenSubKind.ROBOT) {
                condition.id = tokenPayload.sub as Robot['id'];
            } else {
                throw new TokenSubKindInvalidError();
            }

            break;
        }
        default:
            throw new AuthHeaderTypeUnsupported(header.type);
    }

    const repository = getCustomRepository<RobotRepository>(RobotRepository);
    const entity = await repository.findOne({
        ...condition,
    });

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        header.type === AuthorizationHeaderType.BASIC &&
        !(await repository.verifyCredentials(entity.id, header.password))
    ) {
        throw new CredentialsInvalidError();
    }

    let permissions : PermissionItem<any>[];

    if (entity.user_id) {
        const userRepository = getCustomRepository<UserRepository>(UserRepository);
        permissions = await userRepository.getOwnedPermissions(entity.user_id);
    } else {
        permissions = await repository.getOwnedPermissions(entity.id);
    }

    if (header.type === AuthorizationHeaderType.BEARER) {
        request.token = header.token;
    }

    request.robot = entity;
    request.robotId = entity.id;
    request.userId = entity.user_id;
    request.realmId = entity.realm_id;
    request.ability = new AbilityManager(permissions);

    return entity;
}
