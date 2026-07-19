/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionToken } from '@authup/core-kit';
import type {
    ISessionTokenRepository,
    SessionTokenCreateInput,
    SessionTokenRef,
} from '../../../../src/core/index.ts';

export class FakeSessionTokenRepository implements ISessionTokenRepository {
    public createCalls: SessionTokenCreateInput[] = [];

    public findOneByIdCalls: string[] = [];

    public findBySessionIdCalls: string[] = [];

    public markRefreshConsumedCalls: { id: string, at: string }[] = [];

    public hasConsumedChildCalls: string[] = [];

    public revokeByIdCalls: { id: string, at: string }[] = [];

    public revokeBySessionIdCalls: { sessionId: string, at: string }[] = [];

    public deleteExpiredCalls: string[] = [];

    private rows = new Map<string, SessionToken>();

    async create(input: SessionTokenCreateInput): Promise<SessionToken> {
        this.createCalls.push(input);

        const row: SessionToken = {
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
            createdAt: new Date().toISOString(),
        };

        this.rows.set(row.id, row);

        return row;
    }

    async findOneById(id: string): Promise<SessionToken | null> {
        this.findOneByIdCalls.push(id);
        return this.rows.get(id) ?? null;
    }

    async findBySessionId(sessionId: string): Promise<SessionToken[]> {
        this.findBySessionIdCalls.push(sessionId);
        return [...this.rows.values()].filter((row) => row.sessionId === sessionId);
    }

    async markRefreshConsumed(id: string, at: string): Promise<boolean> {
        this.markRefreshConsumedCalls.push({ id, at });

        const row = this.rows.get(id);
        if (
            !row ||
            row.kind !== 'refresh' ||
            row.consumedAt !== null ||
            row.revokedAt !== null
        ) {
            return false;
        }

        row.consumedAt = at;
        return true;
    }

    async hasConsumedChild(parentId: string): Promise<boolean> {
        this.hasConsumedChildCalls.push(parentId);
        for (const row of this.rows.values()) {
            if (row.parentId === parentId && row.consumedAt !== null) {
                return true;
            }
        }
        return false;
    }

    async revokeById(id: string, at: string): Promise<void> {
        this.revokeByIdCalls.push({ id, at });

        const row = this.rows.get(id);
        if (row && row.revokedAt === null) {
            row.revokedAt = at;
        }
    }

    async revokeBySessionId(sessionId: string, at: string): Promise<SessionTokenRef[]> {
        this.revokeBySessionIdCalls.push({ sessionId, at });

        const refs: SessionTokenRef[] = [];
        for (const row of this.rows.values()) {
            if (row.sessionId === sessionId) {
                refs.push({ id: row.id, expiresAt: row.expiresAt });
                if (row.revokedAt === null) {
                    row.revokedAt = at;
                }
            }
        }

        return refs;
    }

    async deleteExpired(before: string): Promise<number> {
        this.deleteExpiredCalls.push(before);

        let count = 0;
        for (const [id, row] of this.rows.entries()) {
            if (row.expiresAt < before) {
                this.rows.delete(id);
                count++;
            }
        }

        return count;
    }
}
