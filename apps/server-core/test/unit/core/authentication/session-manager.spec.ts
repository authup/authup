/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Realm, Session } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { SessionManager } from '../../../../src/core/authentication/session/module.ts';
import type { IBackchannelLogoutNotifier } from '../../../../src/core/authentication/session/types.ts';
import { FakeSessionRepository } from '../entities/session/fake-repository.ts';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const realm: Realm = {
    id: randomUUID(),
    name: 'tenant',
    displayName: null,
    description: null,
    builtIn: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
};

function createClient(): Client {
    const id = randomUUID();

    return {
        id,
        active: true,
        builtIn: false,
        authMethod: 'none',
        tokenBindingMethod: 'none',
        name: `app-${id}`,
        displayName: null,
        description: null,
        secret: null,
        secretHashed: false,
        secretEncrypted: false,
        redirectUri: 'https://app.example.com/**',
        postLogoutRedirectUri: null,
        backchannelLogoutUri: 'https://app.example.com/backchannel-logout',
        grantTypes: null,
        baseUrl: null,
        accessPolicyId: null,
        accessPolicy: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        realmId: realm.id,
        realm,
    };
}

/**
 * Records, for every call, how many rows the repository had removed by then:
 * the ordering (audience read before the row goes, delivery after) is the
 * property under test, and a call-count alone cannot show it.
 */
class RecordingNotifier implements IBackchannelLogoutNotifier {
    public resolveCalls: { sessionId: string, removed: number }[] = [];

    public notifyCalls: {
        sessionId: string, 
        clients: Client[], 
        removed: number 
    }[] = [];

    constructor(
        private repository: FakeSessionRepository,
        private clients: Client[],
    ) {}

    async resolve(session: Session): Promise<Client[]> {
        this.resolveCalls.push({ sessionId: session.id, removed: this.repository.removeCalls.length });
        return this.clients;
    }

    async notify(session: Session, clients: Client[]): Promise<void> {
        this.notifyCalls.push({
            sessionId: session.id, 
            clients, 
            removed: this.repository.removeCalls.length, 
        });
    }
}

describe('SessionManager', () => {
    let repository: FakeSessionRepository;

    const seedSession = (overrides: Partial<Session> = {}) => repository.seed({
        sub: randomUUID(),
        subKind: IdentityType.USER,
        realmId: realm.id,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        ...overrides,
    });

    const buildManager = (notifier?: IBackchannelLogoutNotifier) => new SessionManager({
        repository,
        options: { maxAge: 3_600 },
        backchannelLogoutNotifier: notifier,
    });

    beforeEach(() => {
        repository = new FakeSessionRepository();
    });

    describe('revoke', () => {
        it('resolves the audience before the row is removed and delivers after', async () => {
            const session = seedSession();
            const clients = [createClient(), createClient()];
            const notifier = new RecordingNotifier(repository, clients);

            await buildManager(notifier).revoke(session.id);

            expect(notifier.resolveCalls).toEqual([{ sessionId: session.id, removed: 0 }]);
            expect(repository.removeCalls.map((row) => row.id)).toEqual([session.id]);
            expect(notifier.notifyCalls).toEqual([{
                sessionId: session.id,
                clients,
                removed: 1,
            }]);
            // the repository unsets the id on what it removed (TypeORM does);
            // the manager hands it a copy so the delivery still carries `sid`
            expect(notifier.notifyCalls[0]!.sessionId).toBeDefined();
            expect(notifier.notifyCalls[0]!.sessionId).toEqual(session.id);
            expect(await repository.findOneById(session.id)).toBeNull();
        });

        it('skips the delivery when no client is to be notified', async () => {
            const session = seedSession();
            const notifier = new RecordingNotifier(repository, []);

            await buildManager(notifier).revoke(session.id);

            expect(notifier.resolveCalls).toHaveLength(1);
            expect(repository.removeCalls.map((row) => row.id)).toEqual([session.id]);
            expect(notifier.notifyCalls).toHaveLength(0);
        });

        it('does nothing for an unknown id', async () => {
            seedSession();
            const notifier = new RecordingNotifier(repository, [createClient()]);

            await buildManager(notifier).revoke(randomUUID());

            expect(notifier.resolveCalls).toHaveLength(0);
            expect(repository.removeCalls).toHaveLength(0);
            expect(notifier.notifyCalls).toHaveLength(0);
        });

        it('removes the session without a notifier', async () => {
            const session = seedSession();

            await buildManager().revoke(session.id);

            expect(repository.removeCalls.map((row) => row.id)).toEqual([session.id]);
            expect(await repository.findOneById(session.id)).toBeNull();
        });
    });

    describe('verify', () => {
        it('drops an expired session without a delivery', async () => {
            const session = seedSession({ expiresAt: new Date(Date.now() - 1_000).toISOString() });
            // verify() hands the row itself to remove, which unsets its id
            const { id } = session;
            const notifier = new RecordingNotifier(repository, [createClient()]);

            await expect(buildManager(notifier).verify(session)).rejects.toThrow();

            expect(repository.removeCalls.map((row) => row.id)).toEqual([id]);
            expect(notifier.resolveCalls).toHaveLength(0);
            expect(notifier.notifyCalls).toHaveLength(0);
        });

        it('keeps a live session', async () => {
            const session = seedSession();
            const notifier = new RecordingNotifier(repository, [createClient()]);

            await buildManager(notifier).verify(session);

            expect(repository.removeCalls).toHaveLength(0);
        });
    });
});
