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
    TokenInvalidError,
    TokenSubKindInvalidError,
    User,
} from '@typescript-auth/domains';
import { getCustomRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { AuthorizationHeader, AuthorizationHeaderType } from '@trapi/client';
import { verifyToken } from '../../../../utils';
import { ExpressRequest } from '../../../type';
import { UserRepository } from '../../../../domains';

export async function verifyUserForMiddlewareRequest(
    request: ExpressRequest,
    header: AuthorizationHeader,
    options: {
        writableDirectoryPath: string
    },
) : Promise<User> {
    const condition : Partial<User> = {};

    switch (header.type) {
        case AuthorizationHeaderType.BASIC: {
            condition.name = header.username;
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

            if (tokenPayload.sub_kind === OAuth2AccessTokenSubKind.USER) {
                condition.id = tokenPayload.sub as User['id'];
            } else {
                throw new TokenSubKindInvalidError();
            }
            break;
        }
        default:
            throw new AuthHeaderTypeUnsupported(header.type);
    }

    const repository = getCustomRepository<UserRepository>(UserRepository);
    const entity = await repository.findOne({
        ...condition,
    });

    if (typeof entity === 'undefined') {
        throw new NotFoundError();
    }

    if (
        header.type === AuthorizationHeaderType.BASIC &&
        !await repository.verifyCredentials(header.username, header.password)
    ) {
        throw new CredentialsInvalidError();
    }

    const permissions = await repository.getOwnedPermissions(entity.id);

    if (header.type === AuthorizationHeaderType.BEARER) {
        request.token = header.token;
    }

    request.user = entity;
    request.userId = entity.id;
    request.realmId = entity.realm_id;
    request.ability = new AbilityManager(permissions);

    return entity;
}
