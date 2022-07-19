/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityDescriptor,
    OAuth2SubKind,
    OAuth2TokenVerification,
    Robot,
    TokenError,
    TokenSubMeta,
    getOAuth2SubKindByEntity,
} from '@authelion/common';
import { NotFoundError } from '@typescript-error/http';
import { buildKeyPath } from 'redis-extension';
import {
    RobotRepository, UserAttributeEntity, UserRepository, transformUserAttributes,
} from '../../domains';
import { useDataSource } from '../../database';
import { CachePrefix } from '../../constants';

/**
 *
 * @param token
 *
 * @throws TokenError
 * @throws NotFoundError
 */
export async function getOAuth2TokenSubMeta(token: OAuth2TokenVerification) : Promise<TokenSubMeta> {
    const dataSource = await useDataSource();

    const subKind = getOAuth2SubKindByEntity(token.entity);
    switch (subKind) {
        case OAuth2SubKind.USER: {
            const repository = new UserRepository(dataSource);

            const query = repository.createQueryBuilder('user')
                .addSelect('user.email')
                .where('user.id = :id', { id: token.entity.user_id })
                .cache(buildKeyPath({
                    prefix: CachePrefix.USER,
                    id: token.entity.user_id,
                }), 60.000);

            const entity = await query.getOne();

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
                throw TokenError.targetInactive(OAuth2SubKind.USER);
            }

            const permissions : AbilityDescriptor[] = await repository.getOwnedPermissions(entity.id);

            return {
                kind: OAuth2SubKind.USER,
                entity,
                permissions: permissions || [],
            };
        }
        case OAuth2SubKind.ROBOT: {
            const repository = new RobotRepository(dataSource);

            const entity : Robot | undefined = await repository.findOne({
                where: {
                    id: token.entity.robot_id,
                },
                cache: {
                    milliseconds: 60.000,
                    id: buildKeyPath({
                        prefix: CachePrefix.ROBOT,
                        id: token.entity.robot_id,
                    }),
                },
            });

            if (!entity) {
                throw new NotFoundError();
            }

            if (!entity.active) {
                throw TokenError.targetInactive(OAuth2SubKind.ROBOT);
            }

            let permissions : AbilityDescriptor[] | undefined;

            if (entity.user_id) {
                const userRepository = new UserRepository(dataSource);
                permissions = await userRepository.getOwnedPermissions(entity.user_id);
            } else {
                permissions = await repository.getOwnedPermissions(entity.id);
            }

            return {
                kind: OAuth2SubKind.ROBOT,
                entity,
                permissions: permissions || [],
            };
        }
    }

    throw TokenError.subKindInvalid();
}
