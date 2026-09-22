/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { IQuery } from '@rapiq/core';
import { Query } from '@rapiq/core';
import { applyQuery, compileFilters } from '@rapiq/adapter-memory';
import type { Session } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    ISessionRepository,
    SessionFindManyOptions,
    SessionOwner,
} from '../../../../../src/core/index.ts';

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

        return this.sessions.values()
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
        let { data } = applyQuery(new Query({ filters: query.filters }), this.sessions.values().toArray());
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
        return this.sessions.values().toArray().filter((s) => this.ownedBy(s, owner));
    }

    async findAllByQuery(query: IQuery): Promise<Session[]> {
        // the real filter semantics: the in-memory adapter evaluates the
        // same IR the typeorm adapter lowers to SQL
        const predicate = compileFilters(query.filters);
        return this.sessions.values().toArray()
            .filter((session) => predicate(session));
    }

    async save(input: Partial<Session>): Promise<Session> {
        return this.seed(input);
    }

    async remove(session: Session): Promise<void> {
        this.removeCalls.push({ ...session });
        this.sessions.delete(session.id);
        // TypeORM unsets the primary key on the object it removed; a caller
        // that still needs the id afterwards must have handed over a copy.
        delete (session as Partial<Session>).id;
    }

    async removeById(id: string): Promise<void> {
        const session = this.sessions.get(id);
        if (session) {
            await this.remove(session);
        }
    }

    async deleteExpired(before: string): Promise<number> {
        const expired = this.sessions.values().toArray()
            .filter((session) => session.expiresAt < before);

        expired.forEach((session) => this.sessions.delete(session.id));

        return expired.length;
    }

    private ownedBy(session: Session, owner: SessionOwner): boolean {
        return session.sub === owner.sub && session.subKind === owner.subKind;
    }
}
