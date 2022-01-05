/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository } from 'typeorm';
import { TokenPayload, TokenVerificationPayload } from '@typescript-auth/common';
import { BadRequestError, UnauthorizedError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { verifyToken } from '../../../../security';
import { TokenRouteVerifyContext } from './type';
import { UserRepository } from '../../../../domains/user/repository';

async function verifyTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: TokenRouteVerifyContext,
) : Promise<any> {
    const { id } = req.params;

    let tokenPayload : TokenPayload;

    try {
        tokenPayload = await verifyToken(id, {
            directory: context.rsaKeyPairPath,
        });
    } catch (e) {
        throw new BadRequestError('The token is not valid....');
    }

    // todo: sub can also be client i.g.

    const userRepository = getCustomRepository<UserRepository>(UserRepository);
    const userQuery = userRepository.createQueryBuilder('user')
        .addSelect('user.email')
        .where('user.id = :id', { id: tokenPayload.sub });

    const user = await userQuery.getOne();

    if (typeof user === 'undefined') {
        throw new UnauthorizedError();
    }

    const permissions = await userRepository.getOwnedPermissions(user.id);

    return res.respond({
        data: {
            token: tokenPayload,
            target: {
                type: 'user',
                data: {
                    ...user,
                    permissions,
                },
            },
        } as TokenVerificationPayload,
    });
}
