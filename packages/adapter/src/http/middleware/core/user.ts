/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager,
    AuthorizationHeader,
} from '@typescript-auth/core';
import { TokenPayload, TokenSubKind, User } from '@typescript-auth/domains';
import { getCustomRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { verifyToken } from '../../../utils';
import { ExpressRequest } from '../../type';
import { UserRepository } from '../../../domains';
import { CredentialsInvalidError } from '../../error/credentials-invalid';
import { TokenInvalidError } from '../../error/token-invalid';
import { AuthHeaderTypeUnsupported } from '../../error/auth-header-type-unsupported';

export async function verifyUserForMiddlewareRequest(
    request: ExpressRequest,
    header: AuthorizationHeader,
    options: {
        writableDirectoryPath: string
    },
) : Promise<User | undefined> {
    const condition : Partial<User> = {};

    switch (header.type) {
        case 'Basic':
            condition.name = header.username;
            break;
        case 'Bearer': {
            try {
                const tokenPayload: TokenPayload = await verifyToken(header.token, {
                    directory: options.writableDirectoryPath,
                });

                if (tokenPayload.subKind === TokenSubKind.CLIENT) {
                    condition.id = tokenPayload.sub as typeof User.prototype.id;
                }
            } catch (e) {
                throw new TokenInvalidError();
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
        header.type === 'Basic' &&
        !await repository.verifyCredentials(header.username, header.password)
    ) {
        throw new CredentialsInvalidError();
    }

    const permissions = await repository.getOwnedPermissions(entity.id);

    request.user = entity;
    request.userId = entity.id;
    request.realmId = entity.realm_id;
    request.ability = new AbilityManager(permissions);

    return entity;
}
