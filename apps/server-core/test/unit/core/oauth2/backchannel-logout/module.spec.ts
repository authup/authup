/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Realm, Session } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { createNoopLogger } from '@authup/server-kit';
import { OAuth2TokenKind } from '@authup/specs';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { OAUTH2_BACKCHANNEL_LOGOUT_EVENT } from '../../../../../src/core/oauth2/backchannel-logout/constants.ts';
import { OAuth2BackchannelLogoutNotifier } from '../../../../../src/core/oauth2/backchannel-logout/module.ts';
import type { IOAuth2ClientRepository } from '../../../../../src/core/oauth2/client/types.ts';
import { FakeOAuth2TokenSigner } from '../../helpers/fake-oauth2-token-signer.ts';
import { FakeSessionTokenRepository } from '../../helpers/fake-session-token-repository.ts';

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

function createClient(overrides: Partial<Client> = {}): Client {
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
        backchannelLogoutUri: `https://${id}.example.com/backchannel-logout`,
        grantTypes: null,
        baseUrl: null,
        accessPolicyId: null,
        accessPolicy: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        realmId: realm.id,
        realm,
        ...overrides,
    };
}

function createSession(): Session {
    const sub = randomUUID();

    return {
        id: randomUUID(),
        sub,
        subKind: IdentityType.USER,
        ipAddress: '127.0.0.1',
        userAgent: 'spec',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        refreshedAt: null,
        seenAt: null,
        mfaAt: null,
        authMethod: 'pwd',
        updatedAt: TIMESTAMP,
        createdAt: TIMESTAMP,
        clientId: null,
        client: null,
        userId: sub,
        user: null,
        realmId: realm.id,
        realm,
    };
}

class StubClientRepository implements IOAuth2ClientRepository {
    public calls: string[] = [];

    constructor(private clients: Client[]) {}

    async findOneByIdOrName(idOrName: string): Promise<Client | null> {
        this.calls.push(idOrName);
        return this.clients.find((client) => client.id === idOrName) ?? null;
    }
}

describe('OAuth2BackchannelLogoutNotifier', () => {
    const signer = new FakeOAuth2TokenSigner();
    const logger = createNoopLogger();

    let sessionTokenRepository: FakeSessionTokenRepository;
    let fetchMock: ReturnType<typeof vi.fn>;
    let warn: ReturnType<typeof vi.spyOn>;
    let session: Session;

    const seedToken = (sessionId: string, clientId: string | null, kind: 'access' | 'refresh' = 'access') => sessionTokenRepository.create({
        id: randomUUID(),
        sessionId,
        clientId,
        kind,
        ipAddress: '127.0.0.1',
        userAgent: 'spec',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });

    const buildNotifier = (clients: Client[], options: { issuer?: string, maxAge?: number } = {}) => {
        const clientRepository = new StubClientRepository(clients);
        const notifier = new OAuth2BackchannelLogoutNotifier({
            signer,
            sessionTokenRepository,
            clientRepository,
            options: { issuer: 'https://auth.example.com/', ...options },
            logger,
        });

        return { notifier, clientRepository };
    };

    beforeEach(() => {
        signer.signCalls = [];
        sessionTokenRepository = new FakeSessionTokenRepository();
        session = createSession();

        fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        warn = vi.spyOn(logger, 'warn');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('resolve', () => {
        it('collects each client the session issued a token for exactly once', async () => {
            const a = createClient();
            const b = createClient();
            await seedToken(session.id, a.id, 'access');
            await seedToken(session.id, a.id, 'refresh');
            await seedToken(session.id, b.id);
            // an MFA-login completion attributes its rows to no client
            await seedToken(session.id, null);
            // another session's rows never count
            await seedToken(randomUUID(), createClient().id);

            const { notifier, clientRepository } = buildNotifier([a, b]);
            const clients = await notifier.resolve(session);

            expect(clients.map((client) => client.id)).toEqual([a.id, b.id]);
            expect(clientRepository.calls).toEqual([a.id, b.id]);
        });

        it('skips a client that registered no back-channel logout URI', async () => {
            const silent = createClient({ backchannelLogoutUri: null });
            const listening = createClient();
            await seedToken(session.id, silent.id);
            await seedToken(session.id, listening.id);

            const { notifier } = buildNotifier([silent, listening]);
            const clients = await notifier.resolve(session);

            expect(clients.map((client) => client.id)).toEqual([listening.id]);
        });

        it('skips a client the repository no longer resolves', async () => {
            await seedToken(session.id, randomUUID());

            const { notifier } = buildNotifier([]);

            expect(await notifier.resolve(session)).toEqual([]);
        });

        it('answers empty for a session without token rows', async () => {
            const { notifier } = buildNotifier([createClient()]);

            expect(await notifier.resolve(session)).toEqual([]);
        });
    });

    describe('notify', () => {
        it('posts one form-encoded logout token per client', async () => {
            const a = createClient();
            const b = createClient();
            const { notifier } = buildNotifier([a, b]);

            await notifier.notify(session, [a, b]);

            expect(fetchMock).toHaveBeenCalledTimes(2);

            const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toEqual(a.backchannelLogoutUri);
            expect(init.method).toEqual('POST');
            expect(init.headers).toEqual({ 'content-type': 'application/x-www-form-urlencoded' });
            expect(init.body).toBeInstanceOf(URLSearchParams);
            expect((init.body as URLSearchParams).get('logout_token')).toEqual('signed-token');
            expect(init.signal).toBeInstanceOf(AbortSignal);

            expect((fetchMock.mock.calls[1] as [string])[0]).toEqual(b.backchannelLogoutUri);
            expect(warn).not.toHaveBeenCalled();
        });

        it('signs the claim set the specification requires and no nonce', async () => {
            const client = createClient();
            const { notifier } = buildNotifier([client], { issuer: 'https://auth.example.com/', maxAge: 120 });

            const before = Math.floor(Date.now() / 1000);
            await notifier.notify(session, [client]);
            const after = Math.floor(Date.now() / 1000);

            expect(signer.signCalls).toHaveLength(1);
            const payload = signer.signCalls[0]!;

            expect(payload.kind).toEqual(OAuth2TokenKind.LOGOUT);
            expect(payload.events).toEqual({ [OAUTH2_BACKCHANNEL_LOGOUT_EVENT]: {} });
            expect(payload.sid).toEqual(session.id);
            expect(payload.sub).toEqual(session.sub);
            expect(payload.aud).toEqual(client.id);
            // the trailing slash is stripped, like every other token's iss
            expect(payload.iss).toEqual('https://auth.example.com/realms/tenant');
            expect(payload.realm_id).toEqual(client.realmId);
            expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
            expect(payload.exp).toBeGreaterThanOrEqual(before + 120);
            expect(payload.exp).toBeLessThanOrEqual(after + 120);
            expect(payload).not.toHaveProperty('nonce');
        });

        it('signs with the client realm when the session belongs to another realm', async () => {
            // the cross-realm password grant: a UUID user of one realm logged
            // in through another realm's client. `iss` names the client's
            // realm, so the signing key must come from it too.
            const clientRealm: Realm = {
                ...realm,
                id: randomUUID(),
                name: 'client-realm',
            };
            const client = createClient({ realmId: clientRealm.id, realm: clientRealm });
            const { notifier } = buildNotifier([client]);

            await notifier.notify(session, [client]);

            const payload = signer.signCalls[0]!;
            expect(session.realmId).not.toEqual(clientRealm.id);
            expect(payload.realm_id).toEqual(clientRealm.id);
            expect(payload.iss).toEqual('https://auth.example.com/realms/client-realm');
        });

        it('logs and resolves when the client refuses the token', async () => {
            const client = createClient();
            const { notifier } = buildNotifier([client]);
            fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

            await expect(notifier.notify(session, [client])).resolves.toBeUndefined();

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]![0])).toContain(client.id);
            expect(String(warn.mock.calls[0]![0])).toContain('500');
        });

        it('logs and resolves when the delivery throws', async () => {
            const client = createClient();
            const { notifier } = buildNotifier([client]);
            fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

            await expect(notifier.notify(session, [client])).resolves.toBeUndefined();

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]![0])).toContain(client.id);
            expect(String(warn.mock.calls[0]![0])).toContain('ECONNREFUSED');
        });

        it('still delivers to the other clients when one delivery fails', async () => {
            const failing = createClient();
            const healthy = createClient();
            const { notifier } = buildNotifier([failing, healthy]);
            fetchMock.mockImplementation(async (url: string) => {
                if (url === failing.backchannelLogoutUri) {
                    throw new Error('connect ETIMEDOUT');
                }

                return new Response(null, { status: 200 });
            });

            await notifier.notify(session, [failing, healthy]);

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]![0])).toContain(failing.id);
        });

        it('logs and resolves when the token cannot be signed', async () => {
            const client = createClient();
            const { notifier } = buildNotifier([client]);
            vi.spyOn(signer, 'sign').mockRejectedValue(new Error('no active signing key'));

            await expect(notifier.notify(session, [client])).resolves.toBeUndefined();

            expect(fetchMock).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]![0])).toContain(client.id);
        });
    });
});
