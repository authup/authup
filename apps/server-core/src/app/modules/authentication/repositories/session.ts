/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult, ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { Repository } from 'typeorm';
import { applyRequestQuery } from '../../database/repositories/query.ts';
import type {
    ISessionRepository,
    SessionFindManyOptions,
    SessionOwner,
} from '../../../../core/index.ts';
import { applyRealmScopeSelect } from '../../database/repositories/helpers.ts';
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

        const { pagination } = applyRequestQuery(qb, query, { schema: EntityType.SESSION });

        applyRealmScopeSelect(qb, 'session', ['sub', 'subKind']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('session.sub = :ownerSub AND session.subKind = :ownerSubKind', {
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
            .where('session.sub = :sub AND session.subKind = :subKind', {
                sub: owner.sub,
                subKind: owner.subKind,
            })
            .getMany();
    }

    async findAllByQuery(query: Record<string, any>): Promise<Session[]> {
        const qb = this.repository.createQueryBuilder('session');

        // NOTE: `parameters: ['filters']` — a bulk revoke must reach every
        // matching row. Applying the schema's `pagination.maxLimit` would
        // default the limit to that cap when the caller sends no page (rapiq
        // `finalizePagination`), silently truncating the delete.
        applyRequestQuery(qb, query, { schema: EntityType.SESSION, parameters: ['filters'] });

        applyRealmScopeSelect(qb, 'session', ['sub', 'subKind']);

        return qb.getMany();
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
            { ttl: new Date(session.expiresAt).getTime() - Date.now() },
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
