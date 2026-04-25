/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Session } from '@authup/core-kit';
import { vi } from 'vitest';
import type { ISessionManager } from '../../../../src/core/authentication/session/types.ts';

export class FakeSessionManager implements ISessionManager {
    private sessions = new Map<string, Session>();

    public readonly create = vi.fn(async (session: Partial<Session>) => {
        const id = (session.id as string) || randomUUID();
        const created = { id, ...session } as Session;
        this.sessions.set(id, created);
        return created;
    });

    public readonly ping = vi.fn(async (session: Session) => session);

    public readonly refresh = vi.fn(async (session: Session) => session);

    public readonly verify = vi.fn(async () => {});

    public readonly findOneById = vi.fn(async (id: string) => this.sessions.get(id) ?? null);
}
