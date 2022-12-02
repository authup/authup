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
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import {
    OAuth2ClientEntity,
    RobotEntity,
    RobotRepository,
    UserEntity,
    UserRepository,
} from '@authelion/server-database';
import { resolveOAuth2SubAttributesForScope } from '../scope';

export type OAuth2SubEntity<T extends `${OAuth2SubKind}` | OAuth2SubKind> =
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
 * @param scope
 */
export async function loadOAuth2SubEntity<T extends `${OAuth2SubKind}` | OAuth2SubKind>(
    kind: `${OAuth2SubKind}`,
    id: string,
    scope?: string,
) : Promise<OAuth2SubEntity<T>> {
    let payload : UserEntity | RobotEntity | OAuth2ClientEntity;

    const dataSource = await useDataSource();

    const fields = resolveOAuth2SubAttributesForScope(kind, scope);

    switch (kind) {
        case OAuth2SubKind.CLIENT: {
            const repository = dataSource.getRepository(OAuth2ClientEntity);

            const query = repository.createQueryBuilder('client')
                .where('client.id = :id', { id })
                .cache(true);

            for (let i = 0; i < fields.length; i++) {
                query.addSelect(`client.${fields[i]}`);
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
                .cache(true);

            for (let i = 0; i < fields.length; i++) {
                query.addSelect(`user.${fields[i]}`);
            }

            const entity = await query.getOne();

            if (!entity) {
                throw new NotFoundError();
            }

            await repository.appendAttributes(entity, fields);

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
                .cache(true);

            for (let i = 0; i < fields.length; i++) {
                query.addSelect(`robot.${fields[i]}`);
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
