/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { ICondition, IQuery } from '@rapiq/core';
import { FilterCompoundOperator, isFilter, isFilters } from '@rapiq/core';
import type { Session } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    ISessionRepository,
    SessionFindManyOptions,
    SessionOwner,
} from '../../../../../src/core/index.ts';
import { SESSION_FILTER_KEYS } from '../../../../../src/core/index.ts';

export class FakeSessionRepository implements ISessionRepository {
    public removeCalls: Session[] = [];

    /**
     * Every credential this repository was asked to resolve. Recorded so a
     * spec can assert the store was never consulted at all — "the bearer path
     * wins" is a statement about what did NOT happen, and an assertion on the
     * resulting session id alone would also pass if both lookups ran.
     */
    public findOneBySecretCalls: string[] = [];

    private sessions = new Map<string, Session>();

    seed(session: Partial<Session>): Session {
        const entity = {
            id: session.id || randomUUID(),
            ...session,
        } as Session;
        this.sessions.set(entity.id, entity);
        return entity;
    }

    async findOneById(id: string): Promise<Session | null> {
        return this.sessions.get(id) ?? null;
    }

    async findOneBySecret(secret: string): Promise<Session | null> {
        this.findOneBySecretCalls.push(secret);

        if (!secret) {
            return null;
        }

        return [...this.sessions.values()]
            .find((session) => session.secret === secret) ?? null;
    }

    async updateSecret(id: string, secret: string | null): Promise<void> {
        const session = this.sessions.get(id);
        if (session) {
            session.secret = secret;
        }
    }

    async findMany(
        query: IQuery,
        options: SessionFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Session>> {
        let data = [...this.sessions.values()];
        if (options.owner) {
            data = data.filter((s) => this.ownedBy(s, options.owner!));
        }

        return {
            data,
            meta: {
                total: data.length,
                limit: 50,
                offset: 0,
            },
        };
    }

    async findAllByOwner(owner: SessionOwner): Promise<Session[]> {
        return [...this.sessions.values()].filter((s) => this.ownedBy(s, owner));
    }

    async findAllByQuery(query: IQuery): Promise<Session[]> {
        return [...this.sessions.values()]
            .filter((session) => this.matchesCondition(session, query.filters));
    }

    private matchesCondition(session: Session, condition: ICondition): boolean {
        if (isFilters(condition)) {
            if (condition.value.length === 0) {
                return true;
            }
            if (condition.operator === FilterCompoundOperator.OR) {
                return condition.value.some((child) => this.matchesCondition(session, child));
            }
            return condition.value.every((child) => this.matchesCondition(session, child));
        }

        if (isFilter(condition)) {
            if (!(SESSION_FILTER_KEYS as readonly string[]).includes(condition.field)) {
                // out-of-allowlist key → the schema-bound decode drops it
                return true;
            }
            const values = Array.isArray(condition.value) ? condition.value : [condition.value];
            return values.map(String).includes(String((session as any)[condition.field]));
        }

        return true;
    }

    async save(input: Partial<Session>): Promise<Session> {
        return this.seed(input);
    }

    async remove(session: Session): Promise<void> {
        this.removeCalls.push(session);
        this.sessions.delete(session.id);
    }

    async removeById(id: string): Promise<void> {
        const session = this.sessions.get(id);
        if (session) {
            await this.remove(session);
        }
    }

    private ownedBy(session: Session, owner: SessionOwner): boolean {
        return session.sub === owner.sub && session.subKind === owner.subKind;
    }
}
