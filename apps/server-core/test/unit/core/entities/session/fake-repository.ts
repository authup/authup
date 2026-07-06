/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Session } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    ISessionRepository,
    SessionFindManyOptions,
    SessionOwner,
} from '../../../../../src/core/index.ts';

export class FakeSessionRepository implements ISessionRepository {
    public removeCalls: Session[] = [];

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

    async findMany(
        query: Record<string, any>,
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
        return session.sub === owner.sub && session.sub_kind === owner.subKind;
    }
}
