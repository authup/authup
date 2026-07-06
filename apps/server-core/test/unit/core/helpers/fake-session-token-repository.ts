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
            session_id: input.session_id,
            kind: input.kind,
            parent_id: input.parent_id ?? null,
            refresh_token_id: input.refresh_token_id ?? null,
            ip_address: input.ip_address,
            user_agent: input.user_agent,
            consumed_at: null,
            revoked_at: null,
            expires_at: input.expires_at,
            created_at: new Date().toISOString(),
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
        return [...this.rows.values()].filter((row) => row.session_id === sessionId);
    }

    async markRefreshConsumed(id: string, at: string): Promise<boolean> {
        this.markRefreshConsumedCalls.push({ id, at });

        const row = this.rows.get(id);
        if (
            !row ||
            row.kind !== 'refresh' ||
            row.consumed_at !== null ||
            row.revoked_at !== null
        ) {
            return false;
        }

        row.consumed_at = at;
        return true;
    }

    async hasConsumedChild(parentId: string): Promise<boolean> {
        this.hasConsumedChildCalls.push(parentId);
        for (const row of this.rows.values()) {
            if (row.parent_id === parentId && row.consumed_at !== null) {
                return true;
            }
        }
        return false;
    }

    async revokeById(id: string, at: string): Promise<void> {
        this.revokeByIdCalls.push({ id, at });

        const row = this.rows.get(id);
        if (row && row.revoked_at === null) {
            row.revoked_at = at;
        }
    }

    async revokeBySessionId(sessionId: string, at: string): Promise<SessionTokenRef[]> {
        this.revokeBySessionIdCalls.push({ sessionId, at });

        const refs: SessionTokenRef[] = [];
        for (const row of this.rows.values()) {
            if (row.session_id === sessionId) {
                refs.push({ id: row.id, expires_at: row.expires_at });
                if (row.revoked_at === null) {
                    row.revoked_at = at;
                }
            }
        }

        return refs;
    }

    async deleteExpired(before: string): Promise<number> {
        this.deleteExpiredCalls.push(before);

        let count = 0;
        for (const [id, row] of this.rows.entries()) {
            if (row.expires_at < before) {
                this.rows.delete(id);
                count++;
            }
        }

        return count;
    }
}
