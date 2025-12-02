/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClientIdentity, Identity, RobotIdentity, UserIdentity,
} from '@authup/core-kit';
import {
    ClientError,

    RobotError,
    UserError,
} from '@authup/core-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import { useDataSource } from 'typeorm-extension';
import {
    CachePrefix, ClientRepository, RobotRepository, UserRepository,
} from '../../../../database/domains';
import { OAuth2ScopeAttributesResolver } from '../../scope';
import { OAuth2IdentityResolverError } from './error';

export class OAuth2IdentityResolver {
    protected scopeAttributesResolver : OAuth2ScopeAttributesResolver;

    constructor() {
        this.scopeAttributesResolver = new OAuth2ScopeAttributesResolver();
    }

    async resolve(payload: OAuth2TokenPayload) : Promise<Identity> {
        if (!payload.sub_kind) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub_kind');
        }

        if (!payload.sub) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub');
        }

        switch (payload.sub_kind) {
            case OAuth2SubKind.CLIENT: {
                return this.resolveClient(payload);
            }
            case OAuth2SubKind.ROBOT: {
                return this.resolveRobot(payload);
            }
            case OAuth2SubKind.USER: {
                return this.resolveUser(payload);
            }
        }

        throw OAuth2IdentityResolverError.subKindOneOf();
    }

    async resolveClient(payload: OAuth2TokenPayload) : Promise<ClientIdentity> {
        if (!payload.sub_kind || payload.sub_kind !== OAuth2SubKind.CLIENT) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub_kind');
        }

        if (!payload.sub) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub');
        }

        const dataSource = await useDataSource();
        const repository = new ClientRepository(dataSource);
        const query = repository.createQueryBuilder('client')
            .where('client.id = :id', { id: payload.sub });

        if (payload.realm_id) {
            query.andWhere('client.realm_id = :realmId', { realmId: payload.realm_id });
        }

        // todo: check if attributes matches repository.metadata.columns[].databaseName
        if (payload.scope) {
            const attributes = this.scopeAttributesResolver.resolveFor(OAuth2SubKind.CLIENT, payload.scope);
            for (let i = 0; i < attributes.length; i++) {
                query.addSelect(`client.${attributes[i]}`);
            }
        }

        const entity = await query
            .cache({
                id: buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT,
                    key: payload.sub,
                }),
                milliseconds: 60_000,
            })
            .getOne();

        if (!entity) {
            throw ClientError.notFound();
        }

        if (!entity.active) {
            throw ClientError.inactive();
        }

        return { type: OAuth2SubKind.CLIENT, data: entity };
    }

    async resolveRobot(payload: OAuth2TokenPayload) : Promise<RobotIdentity> {
        if (!payload.sub_kind || payload.sub_kind !== OAuth2SubKind.ROBOT) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub_kind');
        }

        if (!payload.sub) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub');
        }

        const dataSource = await useDataSource();
        const repository = new RobotRepository(dataSource);
        const query = repository.createQueryBuilder('robot')
            .where('robot.id = :id', { id: payload.sub });

        if (payload.realm_id) {
            query.andWhere('robot.realm_id = :realmId', { realmId: payload.realm_id });
        }

        // todo: check if attributes matches repository.metadata.columns[].databaseName
        if (payload.scope) {
            const attributes = this.scopeAttributesResolver.resolveFor(OAuth2SubKind.ROBOT, payload.scope);
            for (let i = 0; i < attributes.length; i++) {
                query.addSelect(`robot.${attributes[i]}`);
            }
        }

        const entity = await query
            .cache({
                id: buildRedisKeyPath({
                    prefix: CachePrefix.ROBOT,
                    key: payload.sub,
                }),
                milliseconds: 60_000,
            })
            .getOne();

        if (!entity) {
            throw RobotError.notFound();
        }

        if (!entity.active) {
            throw RobotError.inactive();
        }

        return { type: OAuth2SubKind.ROBOT, data: entity };
    }

    async resolveUser(payload: OAuth2TokenPayload) : Promise<UserIdentity> {
        if (!payload.sub_kind || payload.sub_kind !== OAuth2SubKind.USER) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub_kind');
        }

        if (!payload.sub) {
            throw OAuth2IdentityResolverError.payloadPropertyInvalid('sub');
        }

        const dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);
        const query = repository.createQueryBuilder('user')
            .where('user.id = :id', { id: payload.sub });

        if (payload.realm_id) {
            query.andWhere('user.realm_id = :realmId', { realmId: payload.realm_id });
        }

        // todo: check if attributes matches repository.metadata.columns[].databaseName
        if (payload.scope) {
            const attributes = this.scopeAttributesResolver.resolveFor(OAuth2SubKind.USER, payload.scope);
            for (let i = 0; i < attributes.length; i++) {
                query.addSelect(`user.${attributes[i]}`);
            }
        }

        const entity = await query
            .cache({
                id: buildRedisKeyPath({
                    prefix: CachePrefix.USER,
                    key: payload.sub,
                }),
                milliseconds: 60_000,
            })
            .getOne();

        if (!entity) {
            throw UserError.notFound();
        }

        if (!entity.active) {
            throw UserError.inactive();
        }

        return { type: OAuth2SubKind.USER, data: entity };
    }
}
