/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository } from 'typeorm';
import {
    PermissionID, TokenPayload, TokenSubKind, TokenVerificationPayload,
} from '@typescript-auth/domains';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { verifyToken } from '../../../../utils';
import { TokenRouteVerifyContext } from './type';
import { RobotRepository, UserRepository } from '../../../../domains';

export async function verifyTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: TokenRouteVerifyContext,
) : Promise<any> {
    let { id } = req.params;

    if (
        !id &&
        typeof req.token === 'string'
    ) {
        id = req.token;
    }

    const hasPermission = req.ability &&
        req.ability.hasPermission(PermissionID.TOKEN_VERIFY);

    if (
        req.token !== id &&
        !hasPermission
    ) {
        throw new ForbiddenError();
    }

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
        entity: {
            type: tokenPayload.subKind,
            data: undefined,
        },
    };

    switch (tokenPayload.subKind) {
        case TokenSubKind.ROBOT: {
            const robotRepository = getCustomRepository<RobotRepository>(RobotRepository);
            const robot = await robotRepository.findOne(tokenPayload.sub);

            if (typeof robot === 'undefined') {
                throw new UnauthorizedError();
            }

            let permissions = [];

            if (robot.user_id) {
                const userRepository = getCustomRepository<UserRepository>(UserRepository);
                permissions = await userRepository.getOwnedPermissions(robot.user_id);
            } else {
                permissions = await robotRepository.getOwnedPermissions(robot.id);
            }

            response.entity.data = {
                ...robot,
                permissions,
            };
            break;
        }
        case TokenSubKind.USER: {
            const userRepository = getCustomRepository<UserRepository>(UserRepository);
            const userQuery = userRepository.createQueryBuilder('user')
                .addSelect('user.email')
                .where('user.id = :id', { id: tokenPayload.sub });

            const user = await userQuery.getOne();

            if (typeof user === 'undefined') {
                throw new UnauthorizedError();
            }

            const permissions = await userRepository.getOwnedPermissions(user.id);

            response.entity.data = {
                ...user,
                permissions,
            };
        }
    }

    return res.respond({
        data: response,
    });
}
