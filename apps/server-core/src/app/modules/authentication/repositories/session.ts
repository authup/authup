/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult, ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { Repository } from 'typeorm';
import { applyQuery } from 'typeorm-extension';
import type {
    ISessionRepository,
    SessionFindManyOptions,
    SessionOwner,
} from '../../../../core/index.ts';
import { AuthenticationCachePrefix } from './constants.ts';

type SessionRepositoryContext = {
    repository: Repository<Session>,
    cache: ICache
};

export class SessionRepository implements ISessionRepository {
    protected cache : ICache;

    protected repository : Repository<Session>;

    // -----------------------------------------------------

    constructor(ctx: SessionRepositoryContext) {
        this.cache = ctx.cache;
        this.repository = ctx.repository;
    }

    // -----------------------------------------------------

    async findOneById(id: string): Promise<Session | null> {
        const session = await this.cache.get<Session>(
            buildCacheKey({
                prefix: AuthenticationCachePrefix.SESSION,
                key: id, 
            }),
        );

        if (session) {
            return session;
        }

        return this.repository.findOneBy({ id });
    }

    // -----------------------------------------------------

    async findMany(
        query: Record<string, any>,
        options: SessionFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Session>> {
        const qb = this.repository.createQueryBuilder('session');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'session',
            fields: {
                allowed: [
                    'id', 
                    'sub', 
                    'sub_kind', 
                    'ip_address', 
                    'user_agent',
                    'expires_at', 
                    'refreshed_at', 
                    'seen_at', 
                    'created_at', 
                    'updated_at',
                    'user_id', 
                    'client_id', 
                    'robot_id', 
                    'realm_id',
                ],
            },
            filters: { allowed: ['id', 'sub', 'sub_kind', 'user_id', 'client_id', 'robot_id', 'realm_id'] },
            relations: { allowed: ['realm'] },
            sort: { allowed: ['seen_at', 'expires_at', 'created_at', 'updated_at'] },
            pagination: { maxLimit: 50 },
        });

        // Force-load the columns the SessionService realm gate + ownership check
        // depend on. Without this a client `fields` projection could drop
        // realm_id (rapiq honors the projection over `default`), leaving the
        // per-row `resourceRealmMatch` with no realm to match — which
        // neutral-passes the realm_scope reach factor and leaks cross-realm
        // sessions to an own/ownOrNull-scoped reader.
        qb.addSelect([
            'session.realm_id',
            'session.sub',
            'session.sub_kind',
        ]);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('session.sub = :ownerSub AND session.sub_kind = :ownerSubKind', {
                ownerSub: options.owner.sub,
                ownerSubKind: options.owner.subKind,
            });
        }

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findAllByOwner(owner: SessionOwner): Promise<Session[]> {
        return this.repository.createQueryBuilder('session')
            .where('session.sub = :sub AND session.sub_kind = :subKind', {
                sub: owner.sub,
                subKind: owner.subKind,
            })
            .getMany();
    }

    // -----------------------------------------------------

    async save(input: Partial<Session>): Promise<Session> {
        const session = this.repository.create(input);
        await this.repository.save(session);

        await this.cache.set(
            buildCacheKey({
                prefix: AuthenticationCachePrefix.SESSION,
                key: session.id, 
            }),
            session,
            { ttl: new Date(session.expires_at).getTime() - Date.now() },
        );

        return session;
    }

    // -----------------------------------------------------

    async remove(session: Session): Promise<void> {
        await this.repository.remove(session);
        await this.cache.drop(
            buildCacheKey({
                prefix: AuthenticationCachePrefix.SESSION,
                key: session.id, 
            }),
        );
    }

    async removeById(id: string): Promise<void> {
        const session = await this.findOneById(id);

        if (session) {
            await this.remove(session);
        }
    }
}
