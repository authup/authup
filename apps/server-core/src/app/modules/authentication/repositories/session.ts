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
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { Brackets } from 'typeorm';
import { applyQuery, redactFieldConditions } from '../../database/repositories/query.ts';
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

    /**
     * Restrict to sessions that served one of the given clients.
     *
     * Two reaches, OR-ed inside one bracket so the whole thing stays a single
     * AND-ed term and cannot widen the surrounding WHERE: the session's own
     * `client_id` (write-once, so it names the client that FIRST authorized
     * on the row) and an EXISTS over `auth_session_tokens`, which carries the
     * per-application attribution for every client the session went on to
     * serve. The session column alone would miss every later application, and
     * the EXISTS alone would miss a session whose tokens have since been
     * swept, so both are needed.
     *
     * Raw column names rather than property paths: this is a correlated
     * subquery against a table with no query surface of its own.
     *
     * The bind parameter stays named `usedClientIds` rather than matching the
     * option. It shares a builder with the conditions rapiq generates from the
     * client's own query, and a name that reads like a column is exactly the
     * one at risk of colliding there, which TypeORM would resolve by silently
     * overwriting a binding.
     */
    protected applyClientIds(qb: SelectQueryBuilder<Session>, ids?: string[]) {
        if (!ids || ids.length === 0) {
            return;
        }

        qb.andWhere(new Brackets((where) => {
            where.where('session.client_id IN (:...usedClientIds)', { usedClientIds: ids })
                .orWhere(
                    'EXISTS (SELECT 1 FROM auth_session_tokens ust' +
                    ' WHERE ust.session_id = session.id' +
                    ' AND ust.client_id IN (:...usedClientIds))',
                    { usedClientIds: ids },
                );
        }));
    }

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

        this.applyClientIds(qb, options.clientIds);

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

    async findAllByQuery(query: IQuery, options: SessionFindManyOptions = {}): Promise<Session[]> {
        const qb = this.repository.createQueryBuilder('session');

        // NOTE: `parameters: ['filters']` — a bulk revoke must reach every
        // matching row. Applying the schema's `pagination.maxLimit` would
        // default the limit to that cap when the caller sends no page (rapiq
        // `finalizePagination`), silently truncating the delete.
        applyQuery(qb, query);

        applyRealmScopeSelect(qb, 'session', ['sub', 'subKind']);

        this.applyClientIds(qb, options.clientIds);

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
