/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Session } from '@authup/core-kit';
import type { ISessionManager } from '../../../../src/core/authentication/session/types.ts';

export class FakeSessionManager implements ISessionManager {
    public createCalls: Partial<Session>[] = [];

    public pingCalls: Session[] = [];

    public refreshCalls: Session[] = [];

    public verifyCalls: Session[] = [];

    public findOneByIdCalls: string[] = [];

    private sessions = new Map<string, Session>();

    async create(session: Partial<Session>): Promise<Session> {
        this.createCalls.push(session);
        const id = (session.id as string) || randomUUID();
        const created = { id, ...session } as Session;
        this.sessions.set(id, created);
        return created;
    }

    async ping(session: Session): Promise<Session> {
        this.pingCalls.push(session);
        return session;
    }

    async refresh(session: Session): Promise<Session> {
        this.refreshCalls.push(session);
        return session;
    }

    async verify(session: Session): Promise<void> {
        this.verifyCalls.push(session);
    }

    async findOneById(id: string): Promise<Session | null> {
        this.findOneByIdCalls.push(id);
        return this.sessions.get(id) ?? null;
    }
}
