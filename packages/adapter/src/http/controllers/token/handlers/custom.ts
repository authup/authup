/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository } from 'typeorm';
import { TokenPayload, TokenVerificationPayload } from '@typescript-auth/domains';
import { BadRequestError, UnauthorizedError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { verifyToken } from '../../../../utils';
import { TokenRouteVerifyContext } from './type';
import { UserRepository } from '../../../../domains';
import { ClientRepository } from '../../../../domains/client';

export async function verifyTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: TokenRouteVerifyContext,
) : Promise<any> {
    const { id } = req.params;

    let tokenPayload : TokenPayload;

    try {
        tokenPayload = await verifyToken(id, {
            directory: context.writableDirectoryPath,
        });
    } catch (e) {
        throw new BadRequestError('The token is not valid....');
    }

    const response : TokenVerificationPayload = {
        token: tokenPayload,
        target: {
            type: tokenPayload.subKind,
            data: undefined,
        },
    };

    switch (tokenPayload.subKind) {
        case 'client': {
            const clientRepository = getCustomRepository<ClientRepository>(ClientRepository);
            const clientQuery = clientRepository.createQueryBuilder('client')
                .where('client.id := id', { id: tokenPayload.sub });

            const client = await clientQuery.getOne();

            if (typeof client === 'undefined') {
                throw new UnauthorizedError();
            }

            let permissions = [];

            if (client.user_id) {
                const userRepository = getCustomRepository<UserRepository>(UserRepository);
                permissions = await userRepository.getOwnedPermissions(client.user_id);
            } else {
                permissions = await clientRepository.getOwnedPermissions(client.id);
            }

            response.target.data = {
                ...client,
                permissions: [],
            };
            break;
        }
        case 'user': {
            const userRepository = getCustomRepository<UserRepository>(UserRepository);
            const userQuery = userRepository.createQueryBuilder('user')
                .addSelect('user.email')
                .where('user.id = :id', { id: tokenPayload.sub });

            const user = await userQuery.getOne();

            if (typeof user === 'undefined') {
                throw new UnauthorizedError();
            }

            const permissions = await userRepository.getOwnedPermissions(user.id);

            response.target.data = {
                ...user,
                permissions,
            };
        }
    }

    return res.respond({
        data: response,
    });
}
