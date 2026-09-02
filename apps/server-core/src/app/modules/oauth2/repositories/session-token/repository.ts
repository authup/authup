/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionToken } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { In, LessThan } from 'typeorm';
import { applyQuery, redactFieldConditions } from '../../../database/repositories/query.ts';
import { deleteInBatches, resolveSweepBatchSize } from '../../../database/repositories/helpers.ts';
import { SessionTokenEntity } from '../../../../../adapters/database/domains/index.ts';
import { isForeignKeyConstraintDatabaseError } from '../../../../../adapters/database/errors/index.ts';
import { SESSION_TOKEN_EXPIRY_SWEEP_BATCH_SIZE, SessionTokenRelationMissingError } from '../../../../../core/index.ts';
import type {
    ISessionTokenRepository,
    SessionTokenCreateInput,
    SessionTokenDeleteExpiredOptions,
    SessionTokenRef,
} from '../../../../../core/index.ts';

export class SessionTokenRepositoryAdapter implements ISessionTokenRepository {
    protected repository: Repository<SessionTokenEntity>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(SessionTokenEntity);
    }

    async create(input: SessionTokenCreateInput): Promise<SessionToken> {
        const entity = this.repository.create({
            id: input.id,
            sessionId: input.sessionId,
            clientId: input.clientId ?? null,
            kind: input.kind,
            parentId: input.parentId ?? null,
            refreshTokenId: input.refreshTokenId ?? null,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            consumedAt: null,
            revokedAt: null,
            expiresAt: input.expiresAt,
        });

        try {
            await this.repository.insert(entity);
        } catch (e) {
            // A rejection means one of the two parents was deleted between the
            // caller resolving it and this write: the session (a concurrent
            // replay reaction, logout, force-logout or sweep) or the client the
            // token is attributed to. Both cascade onto this table, so either
            // way the token rows are already gone and the caller's answer is the
            // same, which is why the error names neither. Report that condition
            // instead of letting a driver error escape as an unhandled internal
            // error (issue #3435).
            if (isForeignKeyConstraintDatabaseError(e)) {
                throw new SessionTokenRelationMissingError();
            }

            throw e;
        }

        // insert() does not hydrate @CreateDateColumn back onto the in-memory
        // entity (the DB fills created_at via its DEFAULT). Stamp it so the
        // returned object satisfies the SessionToken contract instead of
        // carrying an undefined createdAt.
        entity.createdAt = entity.createdAt ?? new Date().toISOString();

        return entity;
    }

    async findOneById(id: string): Promise<SessionToken | null> {
        return this.repository.findOne({ where: { id } });
    }

    async findBySessionId(sessionId: string): Promise<SessionToken[]> {
        return this.repository.find({ where: { sessionId } });
    }

    async markRefreshConsumed(id: string, at: string): Promise<boolean> {
        const result = await this.repository.createQueryBuilder()
            .update(SessionTokenEntity)
            .set({ consumedAt: at })
            .where('id = :id', { id })
            .andWhere('kind = :kind', { kind: 'refresh' })
            .andWhere('consumedAt IS NULL')
            .andWhere('revokedAt IS NULL')
            .execute();

        return (result.affected ?? 0) > 0;
    }

    async hasConsumedChild(parentId: string): Promise<boolean> {
        const count = await this.repository.createQueryBuilder('sessionToken')
            .where('sessionToken.parentId = :parentId', { parentId })
            .andWhere('sessionToken.consumedAt IS NOT NULL')
            .getCount();

        return count > 0;
    }

    async revokeById(id: string, at: string): Promise<void> {
        await this.repository.createQueryBuilder()
            .update(SessionTokenEntity)
            .set({ revokedAt: at })
            .where('id = :id', { id })
            .andWhere('revokedAt IS NULL')
            .execute();
    }

    async revokeBySessionId(sessionId: string, at: string): Promise<SessionTokenRef[]> {
        const rows = await this.repository.find({
            where: { sessionId },
            select: { id: true, expiresAt: true },
        });

        const refs: SessionTokenRef[] = rows.map((row) => ({
            id: row.id,
            expiresAt: row.expiresAt,
        }));
        if (refs.length > 0) {
            await this.repository.createQueryBuilder()
                .update(SessionTokenEntity)
                .set({ revokedAt: at })
                .where({ id: In(refs.map((ref) => ref.id)) })
                .andWhere('revokedAt IS NULL')
                .execute();
        }

        return refs;
    }

    /**
     * Join the session and pin the columns authorization reads.
     *
     * A token row carries no realm or subject, so `SessionTokenService`
     * resolves both through `session`. The join is unconditional and the three
     * columns are selected regardless of the client's `fields` projection, so
     * a projection cannot neutralize the gate the way a stripped `realmId`
     * once could on the entity repositories (plan 039).
     */
    protected joinSessionForGate(qb: SelectQueryBuilder<SessionTokenEntity>) {
        if (qb.expressionMap.joinAttributes.every((join) => join.alias.name !== 'session')) {
            qb.leftJoin('sessionToken.session', 'session');
        }

        qb.addSelect([
            'session.id',
            'session.sub',
            'session.subKind',
            'session.realmId',
        ]);
    }

    /**
     * Always expose only a client SUMMARY (id / name / displayName) on the
     * read paths — the consent-list shape. `client` is deliberately absent
     * from the schema's relations allow-list, so a raw `?include=client`
     * cannot force the full-column join (redirect patterns, grant types,
     * secret storage flags, accessPolicyId), while a self-service reader
     * without CLIENT_READ still gets the application name per token row.
     */
    protected joinClientSummary(qb: SelectQueryBuilder<SessionTokenEntity>) {
        qb.leftJoin('sessionToken.client', 'client');
        qb.addSelect([
            'client.id',
            'client.name',
            'client.displayName',
        ]);
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<SessionToken>> {
        const qb = this.repository.createQueryBuilder('sessionToken');

        const { pagination } = applyQuery(qb, query);

        this.joinSessionForGate(qb);
        this.joinClientSummary(qb);

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: redactFieldConditions(query, entities),
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneWithSessionById(id: string): Promise<SessionToken | null> {
        const qb = this.repository.createQueryBuilder('sessionToken')
            .where('sessionToken.id = :id', { id });

        this.joinSessionForGate(qb);
        this.joinClientSummary(qb);

        return qb.getOne();
    }

    async findAllByQuery(query: IQuery): Promise<SessionToken[]> {
        const qb = this.repository.createQueryBuilder('sessionToken');

        applyQuery(qb, query);

        this.joinSessionForGate(qb);

        return qb.getMany();
    }

    async deleteExpired(
        before: string,
        options: SessionTokenDeleteExpiredOptions = {},
    ): Promise<number> {
        return deleteInBatches(
            this.repository,
            { expiresAt: LessThan(before) },
            resolveSweepBatchSize(options.batchSize, SESSION_TOKEN_EXPIRY_SWEEP_BATCH_SIZE),
        );
    }
}
