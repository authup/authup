/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ClientError, RobotError, ScopeName, UserError, hasOAuth2Scope,
} from '@authup/core-kit';
import {
    OAuth2SubKind,
} from '@authup/specs';
import { buildRedisKeyPath } from '@authup/server-kit';
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
import { resolveOAuth2SubAttributesForScopes } from '../scope';

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
 * @throws ClientError
 * @throws RobotError
 * @throws UserError
 * @throws NotFoundError
 *
 * @param kind
 * @param id
 * @param scopes
 */
export async function loadOAuth2SubEntity<T extends `${OAuth2SubKind}`>(
    kind: T,
    id: string,
    scopes?: string[],
) : Promise<OAuth2SubEntity<T>> {
    const dataSource = await useDataSource();
    const attributes = resolveOAuth2SubAttributesForScopes(kind, scopes);

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
                throw ClientError.notFound();
            }

            return entity as OAuth2SubEntity<T>;
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
                throw UserError.notFound();
            }

            // todo: this might also be the case under other conditions :)
            if (
                scopes &&
                hasOAuth2Scope(scopes, ScopeName.GLOBAL)
            ) {
                await repository.extendOneWithEA(entity);
            }

            if (!entity.active) {
                throw UserError.inactive();
            }

            return entity as OAuth2SubEntity<T>;
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
                throw RobotError.notFound();
            }

            if (!entity.active) {
                throw RobotError.inactive();
            }

            return entity as OAuth2SubEntity<T>;
        }
    }

    throw new SyntaxError(`Sub kind must be one of: ${Object.values(OAuth2SubKind).join(',')}`);
}
