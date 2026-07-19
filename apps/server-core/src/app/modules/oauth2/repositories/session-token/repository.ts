/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionToken } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { In, LessThan } from 'typeorm';
import { SessionTokenEntity } from '../../../../../adapters/database/domains/index.ts';
import type {
    ISessionTokenRepository,
    SessionTokenCreateInput,
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
            kind: input.kind,
            parentId: input.parentId ?? null,
            refreshTokenId: input.refreshTokenId ?? null,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            consumedAt: null,
            revokedAt: null,
            expiresAt: input.expiresAt,
        });

        await this.repository.insert(entity);

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

    async deleteExpired(before: string): Promise<number> {
        const result = await this.repository.delete({ expiresAt: LessThan(before) });

        return result.affected ?? 0;
    }
}
