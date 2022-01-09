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
import { getCustomRepository } from 'typeorm';
import {
    Client, TokenPayload, TokenSubKind,
} from '@typescript-auth/domains';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest } from '../../type';
import { ClientRepository } from '../../../domains/client';
import { UserRepository } from '../../../domains';
import { verifyToken } from '../../../utils';
import { CredentialsInvalidError } from '../../error/credentials-invalid';
import { TokenInvalidError } from '../../error/token-invalid';
import { AuthHeaderTypeUnsupported } from '../../error/auth-header-type-unsupported';

export async function verifyClientForMiddlewareRequest(
    request: ExpressRequest,
    header: AuthorizationHeader,
    options: {
        writableDirectoryPath: string
    },
) : Promise<Client> {
    const condition : Partial<Client> = {};

    switch (header.type) {
        case 'Basic':
            condition.id = header.username;
            break;
        case 'Bearer': {
            try {
                const tokenPayload: TokenPayload = await verifyToken(header.token, {
                    directory: options.writableDirectoryPath,
                });

                if (tokenPayload.subKind === TokenSubKind.CLIENT) {
                    condition.id = tokenPayload.sub as typeof Client.prototype.id;
                }
            } catch (e) {
                throw new TokenInvalidError();
            }
            break;
        }
        default:
            throw new AuthHeaderTypeUnsupported(header.type);
    }

    const repository = getCustomRepository<ClientRepository>(ClientRepository);
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

    let permissions = [];

    if (entity.user_id) {
        const userRepository = getCustomRepository<UserRepository>(UserRepository);
        permissions = await userRepository.getOwnedPermissions(entity.user_id);
    } else {
        permissions = await repository.getOwnedPermissions(entity.id);
    }

    request.clientId = entity.id;
    request.userId = entity.user_id;
    request.realmId = entity.realm_id;
    request.ability = new AbilityManager(permissions);

    return entity;
}
