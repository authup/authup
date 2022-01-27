/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getCustomRepository } from 'typeorm';
import {
    OAuth2TokenSubKind, PermissionID, TokenVerificationPayload,
} from '@typescript-auth/domains';
import {
    ForbiddenError, NotFoundError, UnauthorizedError,
} from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { RobotRepository, UserRepository } from '../../../../domains';
import { verifyOAuth2Token } from '../../../oauth2';
import { ControllerOptions } from '../../type';

export async function verifyTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    options: ControllerOptions,
) : Promise<any> {
    let { id } = req.params;

    if (
        !id &&
        typeof req.token === 'string'
    ) {
        id = req.token;
    }

    if (!id) {
        throw new NotFoundError();
    }

    const hasPermission = req.ability &&
        req.ability.hasPermission(PermissionID.TOKEN_VERIFY);

    if (
        req.token !== id &&
        !hasPermission
    ) {
        throw new ForbiddenError();
    }

    const token = await verifyOAuth2Token(
        id,
        {
            keyPairOptions: {
                directory: options.writableDirectoryPath,
            },
            redis: options.redis,
        },
    );

    const response : TokenVerificationPayload = {
        payload: token.payload,
        entity: token.entity,
        target: {
            type: token.payload.sub_kind,
            data: undefined,
        },
    };

    switch (token.payload.sub_kind) {
        case OAuth2TokenSubKind.ROBOT: {
            const robotRepository = getCustomRepository<RobotRepository>(RobotRepository);
            const robot = await robotRepository.findOne(token.payload.sub);

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

            response.target.data = {
                ...robot,
                permissions,
            };
            break;
        }
        case OAuth2TokenSubKind.USER: {
            const userRepository = getCustomRepository<UserRepository>(UserRepository);
            const userQuery = userRepository.createQueryBuilder('user')
                .addSelect('user.email')
                .where('user.id = :id', { id: token.payload.sub });

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
