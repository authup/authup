/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { EntityRepositoryFindManyResult, ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { Repository } from 'typeorm';
import { LessThan } from 'typeorm';
import { applyQuery, redactFieldConditions } from '../../database/repositories/query.ts';
import { hashSessionSecret } from '../../../../core/index.ts';
import type {
    ISessionRepository,
    SessionDeleteExpiredOptions,
    SessionFindManyOptions,
    SessionOwner,
} from '../../../../core/index.ts';
import { SESSION_EXPIRY_SWEEP_BATCH_SIZE } from '../../../../core/index.ts';
import {
    applyRealmScopeSelect,
    deleteInBatches,
    resolveSweepBatchSize,
} from '../../database/repositories/helpers.ts';
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

    async findOneBySecret(secret: string): Promise<Session | null> {
        if (!secret) {
            // A blank handle must never become a query: the column is
            // nullable, so an empty match is meaningless, and refusing it here
            // keeps a missing cookie from reaching the database at all.
            return null;
        }

        // Deliberately not cached: the session cache is id-keyed, and the
        // credential is a multi-day one, so the row is the authority (a cache
        // a replica never saw would answer anonymous in steady state).
        // The column holds a digest, never the credential itself.
        return this.repository.findOneBy({ secret: hashSessionSecret(secret) });
    }

    async updateSecret(id: string, secret: string | null): Promise<void> {
        await this.repository.update({ id }, { secret: secret === null ? null : hashSessionSecret(secret) });

        // The cached copy never carries the secret (see `save`), so nothing
        // cached goes stale here. `auth_sessions` has no entity subscriber, so
        // a targeted update publishes nothing either.
    }

    // -----------------------------------------------------

    async findMany(
        query: IQuery,
        options: SessionFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Session>> {
        const qb = this.repository.createQueryBuilder('session');

        const { pagination } = applyQuery(qb, query);

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
            data: redactFieldConditions(query, entities),
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

    async findAllByQuery(query: IQuery): Promise<Session[]> {
        const qb = this.repository.createQueryBuilder('session');

        // NOTE: `parameters: ['filters']` — a bulk revoke must reach every
        // matching row. Applying the schema's `pagination.maxLimit` would
        // default the limit to that cap when the caller sends no page (rapiq
        // `finalizePagination`), silently truncating the delete.
        applyQuery(qb, query);

        applyRealmScopeSelect(qb, 'session', ['sub', 'subKind']);

        return qb.getMany();
    }

    // -----------------------------------------------------

    async save(input: Partial<Session>): Promise<Session> {
        const session = this.repository.create(input);
        await this.repository.save(session);

        // The cookie handle must never enter the cache. `findOneById` serves
        // the cached object verbatim, and an owner reads its own session
        // through `GET /sessions/:id` with no permission at all, so a cached
        // secret would be published where a `select: false` column is
        // otherwise absent by construction. Omitted rather than nulled: a
        // cached `secret: null` fed back through `save()` (ping / refresh both
        // do exactly that) would clear the column and kill a live console
        // session on its first request.
        const cacheable : Session = { ...session };
        delete cacheable.secret;

        await this.cache.set(
            buildCacheKey({
                prefix: AuthenticationCachePrefix.SESSION,
                key: session.id,
            }),
            cacheable,
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

    async deleteExpired(
        before: string,
        options: SessionDeleteExpiredOptions = {},
    ): Promise<number> {
        // Deliberately bypasses the cache, unlike `remove`. A cached session
        // is written with `ttl = expiresAt - now` on every save (creation and
        // every refresh alike), so an entry has always lapsed by the time its
        // row matches this predicate. Dropping the keys would mean reading
        // each row back only to evict something that is already gone.
        return deleteInBatches(
            this.repository,
            { expiresAt: LessThan(before) },
            resolveSweepBatchSize(options.batchSize, SESSION_EXPIRY_SWEEP_BATCH_SIZE),
        );
    }
}
