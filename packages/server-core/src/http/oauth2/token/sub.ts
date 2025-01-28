/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import {
    OAuth2SubKind,
    TokenError,
} from '@authup/specs';
import { buildRedisKeyPath } from '@authup/server-kit';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import type {
    RobotEntity,
    UserEntity,
} from '../../../database/domains';
import {
    CachePrefix,
    ClientEntity,
    RobotRepository,
    UserRepository,
} from '../../../database/domains';
import { resolveOAuth2SubAttributesForScope } from '../scope';

export type OAuth2SubEntity<T extends `${OAuth2SubKind}` | OAuth2SubKind> =
    T extends `${OAuth2SubKind.USER}` | OAuth2SubKind.USER ?
        UserEntity :
        T extends `${OAuth2SubKind.ROBOT}` | OAuth2SubKind.ROBOT ?
            RobotEntity :
            T extends `${OAuth2SubKind.CLIENT}` | OAuth2SubKind.CLIENT ?
                ClientEntity :
                never;

/**
 *
 *
 * @throws TokenError
 * @throws NotFoundError
 * @param kind
 * @param id
 * @param scope
 */
export async function loadOAuth2SubEntity<T extends `${OAuth2SubKind}` | OAuth2SubKind>(
    kind: `${OAuth2SubKind}`,
    id: string,
    scope?: string,
) : Promise<OAuth2SubEntity<T>> {
    let payload : UserEntity | RobotEntity | ClientEntity;

    const dataSource = await useDataSource();
    const attributes = resolveOAuth2SubAttributesForScope(kind, scope);

    switch (kind) {
        case OAuth2SubKind.CLIENT: {
            const repository = dataSource.getRepository(ClientEntity);

            const query = repository.createQueryBuilder('client')
                .where('client.id = :id', { id })
                .cache({
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.CLIENT,
                        key: id,
                    }),
                    milliseconds: 60.000,
                });

            // todo: check if attributes matches repository.metadata.columns[].databaseName
            for (let i = 0; i < attributes.length; i++) {
                query.addSelect(`client.${attributes[i]}`);
            }

            const entity = await query.getOne();

            if (!entity) {
                throw new NotFoundError();
            }

            payload = entity;
            break;
        }
        case OAuth2SubKind.USER: {
            const repository = new UserRepository(dataSource);

            const query = repository.createQueryBuilder('user')
                .where('user.id = :id', { id })
                .cache({
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.USER,
                        key: id,
                    }),
                    milliseconds: 60.000,
                });

            // todo: check if attributes matches repository.metadata.columns[].databaseName
            for (let i = 0; i < attributes.length; i++) {
                query.addSelect(`user.${attributes[i]}`);
            }

            const entity = await query.getOne();

            if (!entity) {
                throw new NotFoundError();
            }

            // todo: this might also be the case under other conditions :)
            if (scope === ScopeName.GLOBAL) {
                await repository.extendOneWithEA(entity);
            }

            if (!entity.active) {
                throw TokenError.targetInactive(OAuth2SubKind.USER);
            }

            payload = entity;
            break;
        }
        case OAuth2SubKind.ROBOT: {
            const repository = new RobotRepository(dataSource);

            const query = repository.createQueryBuilder('robot')
                .where('robot.id = :id', { id })
                .cache({
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.ROBOT,
                        key: id,
                    }),
                    milliseconds: 60.000,
                });

            // todo: check if attributes matches repository.metadata.columns[].databaseName
            for (let i = 0; i < attributes.length; i++) {
                query.addSelect(`robot.${attributes[i]}`);
            }

            const entity = await query.getOne();

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

    return payload as OAuth2SubEntity<T>;
}
