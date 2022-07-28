/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2SubKind,
    TokenError,
} from '@authelion/common';
import { NotFoundError } from '@typescript-error/http';
import { buildKeyPath } from 'redis-extension';
import {
    OAuth2ClientEntity,
    RobotEntity,
    RobotRepository, UserAttributeEntity, UserEntity, UserRepository, transformUserAttributes,
} from '../../domains';
import { useDataSource } from '../../database';
import { CachePrefix } from '../../constants';

type Payload<T extends `${OAuth2SubKind}` | OAuth2SubKind> =
    T extends `${OAuth2SubKind.USER}` | OAuth2SubKind.USER ?
        UserEntity :
        T extends `${OAuth2SubKind.ROBOT}` | OAuth2SubKind.ROBOT ?
            RobotEntity :
            T extends `${OAuth2SubKind.CLIENT}` | OAuth2SubKind.CLIENT ?
                OAuth2ClientEntity :
                never;

/**
 *
 *
 * @throws TokenError
 * @throws NotFoundError
 * @param kind
 * @param id
 */
export async function loadOAuth2SubEntity<T extends `${OAuth2SubKind}` | OAuth2SubKind>(
    kind: `${OAuth2SubKind}`,
    id: string,
) : Promise<Payload<T>> {
    let payload : UserEntity | RobotEntity | OAuth2ClientEntity;

    const dataSource = await useDataSource();

    switch (kind) {
        case OAuth2SubKind.CLIENT: {
            const repository = dataSource.getRepository(OAuth2ClientEntity);

            const entity = await repository.findOne({
                where: {
                    id,
                },
                cache: {
                    milliseconds: 60.000,
                    id: buildKeyPath({
                        prefix: CachePrefix.ROBOT,
                        id,
                    }),
                },
            });

            if (!entity) {
                throw new NotFoundError();
            }

            payload = entity;
            break;
        }
        case OAuth2SubKind.USER: {
            const repository = new UserRepository(dataSource);

            const query = repository.createQueryBuilder('user')
                .addSelect('user.email')
                .where('user.id = :id', { id })
                .cache(buildKeyPath({
                    prefix: CachePrefix.USER,
                    id,
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

            payload = entity;
            break;
        }
        case OAuth2SubKind.ROBOT: {
            const repository = new RobotRepository(dataSource);

            const entity = await repository.findOne({
                where: {
                    id,
                },
                cache: {
                    milliseconds: 60.000,
                    id: buildKeyPath({
                        prefix: CachePrefix.ROBOT,
                        id,
                    }),
                },
            });

            if (!entity) {
                throw new NotFoundError();
            }

            if (!entity.active) {
                throw TokenError.targetInactive(OAuth2SubKind.ROBOT);
            }

            payload = entity;
            break;
        }
    }

    if (!payload) {
        throw new NotFoundError();
    }

    return payload as Payload<T>;
}
