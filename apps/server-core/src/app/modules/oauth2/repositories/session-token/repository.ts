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
            session_id: input.session_id,
            kind: input.kind,
            parent_id: input.parent_id ?? null,
            refresh_token_id: input.refresh_token_id ?? null,
            ip_address: input.ip_address,
            user_agent: input.user_agent,
            consumed_at: null,
            revoked_at: null,
            expires_at: input.expires_at,
        });

        await this.repository.insert(entity);

        // insert() does not hydrate @CreateDateColumn back onto the in-memory
        // entity (the DB fills created_at via its DEFAULT). Stamp it so the
        // returned object satisfies the SessionToken contract instead of
        // carrying an undefined created_at.
        entity.created_at = entity.created_at ?? new Date().toISOString();

        return entity;
    }

    async findOneById(id: string): Promise<SessionToken | null> {
        return this.repository.findOne({ where: { id } });
    }

    async findBySessionId(sessionId: string): Promise<SessionToken[]> {
        return this.repository.find({ where: { session_id: sessionId } });
    }

    async markRefreshConsumed(id: string, at: string): Promise<boolean> {
        const result = await this.repository.createQueryBuilder()
            .update(SessionTokenEntity)
            .set({ consumed_at: at })
            .where('id = :id', { id })
            .andWhere('kind = :kind', { kind: 'refresh' })
            .andWhere('consumed_at IS NULL')
            .andWhere('revoked_at IS NULL')
            .execute();

        return (result.affected ?? 0) > 0;
    }

    async hasConsumedChild(parentId: string): Promise<boolean> {
        const count = await this.repository.createQueryBuilder()
            .where('parent_id = :parentId', { parentId })
            .andWhere('consumed_at IS NOT NULL')
            .getCount();

        return count > 0;
    }

    async revokeById(id: string, at: string): Promise<void> {
        await this.repository.createQueryBuilder()
            .update(SessionTokenEntity)
            .set({ revoked_at: at })
            .where('id = :id', { id })
            .andWhere('revoked_at IS NULL')
            .execute();
    }

    async revokeBySessionId(sessionId: string, at: string): Promise<SessionTokenRef[]> {
        const rows = await this.repository.find({
            where: { session_id: sessionId },
            select: ['id', 'expires_at'],
        });

        const refs: SessionTokenRef[] = rows.map((row) => ({
            id: row.id,
            expires_at: row.expires_at,
        }));
        if (refs.length > 0) {
            await this.repository.createQueryBuilder()
                .update(SessionTokenEntity)
                .set({ revoked_at: at })
                .where({ id: In(refs.map((ref) => ref.id)) })
                .andWhere('revoked_at IS NULL')
                .execute();
        }

        return refs;
    }

    async deleteExpired(before: string): Promise<number> {
        const result = await this.repository.delete({ expires_at: LessThan(before) });

        return result.affected ?? 0;
    }
}
