/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityDescriptor,
    OAuth2TokenSubKind, OAuth2TokenVerification, Robot,
    TokenError,
    TokenVerificationPayload,
} from '@authelion/common';
import { NotFoundError } from '@typescript-error/http';
import { buildKeyPath } from 'redis-extension';
import {
    RobotRepository, UserAttributeEntity, UserRepository, transformUserAttributes,
} from '../../../domains';
import { useDataSource } from '../../../database';
import { CachePrefix } from '../../../constants';

/**
 *
 * @param token
 *
 * @throws TokenError
 * @throws NotFoundError
 */
export async function extendOAuth2Token(token: OAuth2TokenVerification) {
    const data : TokenVerificationPayload = {
        ...token,
    };

    const dataSource = await useDataSource();

    switch (data.payload.sub_kind) {
        case OAuth2TokenSubKind.ROBOT: {
            const robotRepository = new RobotRepository(dataSource);

            const entity : Robot | undefined = await robotRepository.findOne({
                where: {
                    id: data.payload.sub,
                },
                cache: {
                    milliseconds: 60.000,
                    id: buildKeyPath({
                        prefix: CachePrefix.ROBOT,
                        id: data.payload.sub,
                    }),
                },
            });

            if (!entity) {
                throw new NotFoundError();
            }

            if (!entity.active) {
                throw TokenError.targetInactive(OAuth2TokenSubKind.ROBOT);
            }

            let permissions : AbilityDescriptor[] | undefined;

            if (entity.user_id) {
                const userRepository = new UserRepository(dataSource);
                permissions = await userRepository.getOwnedPermissions(entity.user_id);
            } else {
                permissions = await robotRepository.getOwnedPermissions(entity.id);
            }

            data.target = {
                kind: OAuth2TokenSubKind.ROBOT,
                entity,
                permissions: permissions || [],
            };
            break;
        }
        case OAuth2TokenSubKind.USER: {
            const userRepository = new UserRepository(dataSource);

            const userQuery = userRepository.createQueryBuilder('user')
                .addSelect('user.email')
                .where('user.id = :id', { id: token.payload.sub })
                .cache(buildKeyPath({
                    prefix: CachePrefix.USER,
                    id: data.payload.sub,
                }), 60.000);

            const entity = await userQuery.getOne();

            if (!entity) {
                throw new NotFoundError();
            }

            const userAttributeRepository = dataSource.getRepository(UserAttributeEntity);
            const userAttributes = await userAttributeRepository.find({
                where: {
                    user_id: entity.id,
                },
                cache: {
                    id: buildKeyPath({
                        prefix: CachePrefix.USER_OWNED_ATTRIBUTES,
                        id: entity.id,
                    }),
                    milliseconds: 60.000,
                },
            });

            entity.extra = transformUserAttributes(userAttributes);

            if (!entity.active) {
                throw TokenError.targetInactive(OAuth2TokenSubKind.USER);
            }

            const permissions : AbilityDescriptor[] = await userRepository.getOwnedPermissions(entity.id);

            data.target = {
                kind: OAuth2TokenSubKind.USER,
                entity,
                permissions: permissions || [],
            };
        }
    }

    return data;
}
