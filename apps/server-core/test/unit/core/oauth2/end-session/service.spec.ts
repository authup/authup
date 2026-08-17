/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Realm } from '@authup/core-kit';
import { EventName } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2EndSessionService } from '../../../../../src/core/oauth2/end-session/service.ts';
import type {
    IOAuth2ClientRepository,
    IOAuth2TokenVerifier,
} from '../../../../../src/core/index.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';
import { FakeEventService } from '../../helpers/fake-event-service.ts';
import { FakeRealmRepository } from '../../entities/realm/fake-repository.ts';

const realmId = randomUUID();
const clientId = randomUUID();

const realm: Realm = {
    id: realmId,
    name: 'master',
    displayName: null,
    description: null,
    builtIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const client: Client = {
    id: clientId,
    active: true,
    builtIn: true,
    authMethod: 'none',
    tokenBindingMethod: 'none',
    name: 'web',
    displayName: null,
    description: null,
    secret: null,
    secretHashed: false,
    secretEncrypted: false,
    redirectUri: 'https://app.example.com/**',
    postLogoutRedirectUri: 'https://app.example.com/**',
    grantTypes: null,
    scope: null,
    baseUrl: null,
    rootUrl: null,
    accessPolicyId: null,
    accessPolicy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    realmId,
    realm,
};

const realmRepository = new FakeRealmRepository();

const clientRepository: IOAuth2ClientRepository = { findOneByIdOrName: async () => client };

// A token-verifier stub whose behavior is set per test.
function buildVerifier(behavior: () => Promise<OAuth2TokenPayload>): IOAuth2TokenVerifier {
    return {
        isInactive: async () => false,
        verify: behavior,
    };
}

describe('OAuth2EndSessionService', () => {
    let sessionManager: FakeSessionManager;
    let eventService: FakeEventService;

    const sub = randomUUID();
    const sessionId = randomUUID();

    const validPayload: OAuth2TokenPayload = {
        kind: OAuth2TokenKind.ID_TOKEN,
        sub,
        sub_kind: OAuth2SubKind.USER,
        sid: sessionId,
        aud: clientId,
    };

    const buildService = (
        verify: () => Promise<OAuth2TokenPayload>,
        hintGracePeriod?: number,
    ) => new OAuth2EndSessionService({
        tokenVerifier: buildVerifier(verify),
        sessionManager,
        clientRepository,
        realmRepository,
        eventService,
        hintGracePeriod,
    });

    beforeEach(() => {
        sessionManager = new FakeSessionManager();
        eventService = new FakeEventService();
    });

    it('should verify a valid id_token_hint', async () => {
        const service = buildService(async () => validPayload);
        const result = await service.verify({ id_token_hint: 'valid', client_id: clientId });

        expect(result.hintVerified).toBe(true);
        expect(result.sub).toEqual(sub);
        expect(result.sessionId).toEqual(sessionId);
    });

    it('should NOT verify a forged hint (signature failure)', async () => {
        const service = buildService(async () => { throw new Error('bad signature'); });
        const result = await service.verify({ id_token_hint: 'forged' });

        expect(result.hintVerified).toBe(false);
        expect(result.sub).toBeUndefined();
        expect(result.sessionId).toBeUndefined();
    });

    it('should NOT verify a non-id_token (e.g. access token) presented as hint', async () => {
        const service = buildService(async () => ({ ...validPayload, kind: OAuth2TokenKind.ACCESS }));
        const result = await service.verify({ id_token_hint: 'access' });

        expect(result.hintVerified).toBe(false);
        expect(result.sessionId).toBeUndefined();
    });

    it('should NOT verify when aud and client_id mismatch', async () => {
        const service = buildService(async () => validPayload);
        const result = await service.verify({ id_token_hint: 'valid', client_id: randomUUID() });

        expect(result.hintVerified).toBe(false);
    });

    it('should verify when client_id is one of a multi-valued aud', async () => {
        const service = buildService(async () => ({ ...validPayload, aud: [clientId, randomUUID()] }));
        const result = await service.verify({ id_token_hint: 'valid', client_id: clientId });

        expect(result.hintVerified).toBe(true);
    });

    it('should NOT verify when client_id is absent from a multi-valued aud', async () => {
        const service = buildService(async () => ({ ...validPayload, aud: [randomUUID(), randomUUID()] }));
        const result = await service.verify({ id_token_hint: 'valid', client_id: clientId });

        expect(result.hintVerified).toBe(false);
    });

    it('should NOT verify an aud-less hint when the request supplies a client_id (fail closed)', async () => {
        // the cross-check must not silently skip on an empty aud — an aud-less
        // hint cannot prove the client_id binding it claims
        const service = buildService(async () => ({ ...validPayload, aud: undefined }));
        const result = await service.verify({ id_token_hint: 'valid', client_id: clientId });

        expect(result.hintVerified).toBe(false);
        expect(result.sub).toBeUndefined();
        expect(result.sessionId).toBeUndefined();
    });

    it('should verify a name-form client_id via its resolved UUID (realm from the verified hint)', async () => {
        // the id_token aud is the client UUID, so `client_id=web` must be
        // resolved before the cross-check — scoped by the hint's own realm
        // claim when the request carries no realm hint.
        const hintRealm: Realm = {
            ...realm, 
            id: randomUUID(), 
            name: 'tenant-a', 
            builtIn: false,
        };
        const scopedRealmRepository = new FakeRealmRepository();
        scopedRealmRepository.seed([hintRealm]);

        const resolveCalls: [string, string | undefined][] = [];
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => ({ ...validPayload, realm_id: hintRealm.id })),
            sessionManager,
            clientRepository: {
                findOneByIdOrName: async (idOrName, realmId) => {
                    resolveCalls.push([idOrName, realmId]);
                    return idOrName === client.name && realmId === hintRealm.id ? client : null;
                },
            },
            realmRepository: scopedRealmRepository,
        });

        const result = await service.verify({ id_token_hint: 'valid', client_id: client.name });

        expect(resolveCalls).toEqual([[client.name, hintRealm.id]]);
        expect(result.hintVerified).toBe(true);
        expect(result.sub).toEqual(sub);
        expect(result.sessionId).toEqual(sessionId);
    });

    it('should NOT verify a name-form client_id that does not resolve to a client (fail closed)', async () => {
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => validPayload),
            sessionManager,
            clientRepository: { findOneByIdOrName: async () => null },
            realmRepository,
        });

        const result = await service.verify({
            id_token_hint: 'valid', 
            client_id: 'web', 
            realm_name: 'master', 
        });

        expect(result.hintVerified).toBe(false);
        expect(result.sessionId).toBeUndefined();
    });

    it('should NOT verify a name-form client_id resolving to a client absent from aud', async () => {
        const otherClient: Client = { ...client, id: randomUUID() };
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => validPayload),
            sessionManager,
            clientRepository: { findOneByIdOrName: async () => otherClient },
            realmRepository,
        });

        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: otherClient.name,
            realm_name: 'master',
        });

        expect(result.hintVerified).toBe(false);
        expect(result.sessionId).toBeUndefined();
    });

    it('should skip the client lookup when a supplied realm hint does not resolve (name client_id)', async () => {
        // an unknown realm key must fail closed — never degrade to an unscoped
        // name lookup (fail-closed realm-key convention)
        const lookupCalls: string[] = [];
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => validPayload),
            sessionManager,
            clientRepository: {
                findOneByIdOrName: async (idOrName) => {
                    lookupCalls.push(idOrName);
                    return client;
                },
            },
            realmRepository,
        });

        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: client.name,
            realm_name: 'unknown-realm',
            post_logout_redirect_uri: 'https://app.example.com/after-logout',
        });

        expect(lookupCalls).toHaveLength(0);
        expect(result.hintVerified).toBe(false);
        expect(result.clientName).toBeUndefined();
        expect(result.redirectUri).toBeUndefined();
    });

    it('should keep a UUID client_id aud-verified when the realm hint does not resolve (no redirect honored)', async () => {
        // the raw-UUID aud comparison is independent of client resolution —
        // only the client-derived outputs (name, redirect) fail closed
        const lookupCalls: string[] = [];
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => validPayload),
            sessionManager,
            clientRepository: {
                findOneByIdOrName: async (idOrName) => {
                    lookupCalls.push(idOrName);
                    return client;
                },
            },
            realmRepository,
        });

        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: clientId,
            realm_name: 'unknown-realm',
            post_logout_redirect_uri: 'https://app.example.com/after-logout',
        });

        expect(lookupCalls).toHaveLength(0);
        expect(result.hintVerified).toBe(true);
        expect(result.sessionId).toEqual(sessionId);
        expect(result.clientName).toBeUndefined();
        expect(result.redirectUri).toBeUndefined();
    });

    it('should fail closed for a name-form client_id without any realm key (ambiguous name)', async () => {
        // no request realm hint and no usable hint realm claim (the hint is
        // unverified) — every realm has a built-in `web` client, so an unscoped
        // name lookup is ambiguous (same rule as the /authorize verifier)
        const lookupCalls: string[] = [];
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => { throw new Error('bad signature'); }),
            sessionManager,
            clientRepository: {
                findOneByIdOrName: async (idOrName) => {
                    lookupCalls.push(idOrName);
                    return client;
                },
            },
            realmRepository,
        });

        const result = await service.verify({
            id_token_hint: 'forged',
            client_id: client.name,
            post_logout_redirect_uri: 'https://app.example.com/after-logout',
        });

        expect(lookupCalls).toHaveLength(0);
        expect(result.hintVerified).toBe(false);
        expect(result.clientName).toBeUndefined();
        expect(result.redirectUri).toBeUndefined();
    });

    it('should verify an arbitrarily-old expired hint by default (unbounded window)', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const service = buildService(async () => ({ ...validPayload, exp: nowSeconds - 999_999 }));
        const result = await service.verify({ id_token_hint: 'expired' });

        expect(result.hintVerified).toBe(true);
    });

    it('should NOT verify a hint expired beyond the grace window', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const service = buildService(async () => ({ ...validPayload, exp: nowSeconds - 7200 }), 3600);
        const result = await service.verify({ id_token_hint: 'too-old' });

        expect(result.hintVerified).toBe(false);
        expect(result.sessionId).toBeUndefined();
    });

    it('should verify a hint expired within the grace window', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const service = buildService(async () => ({ ...validPayload, exp: nowSeconds - 1800 }), 3600);
        const result = await service.verify({ id_token_hint: 'recently-expired' });

        expect(result.hintVerified).toBe(true);
        expect(result.sessionId).toEqual(sessionId);
    });

    it('should verify an unexpired hint under a bounded window', async () => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const service = buildService(async () => ({ ...validPayload, exp: nowSeconds + 900 }), 3600);
        const result = await service.verify({ id_token_hint: 'fresh' });

        expect(result.hintVerified).toBe(true);
    });

    it('should fail closed under a bounded window when the hint carries no exp claim', async () => {
        const service = buildService(async () => validPayload, 3600);
        const result = await service.verify({ id_token_hint: 'exp-less' });

        expect(result.hintVerified).toBe(false);
    });

    it('should honor a post_logout_redirect_uri matching a registered pattern', async () => {
        const service = buildService(async () => validPayload);
        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: clientId,
            post_logout_redirect_uri: 'https://app.example.com/after-logout',
            state: 'xyz',
        });

        expect(result.redirectUri).toEqual('https://app.example.com/after-logout');
        expect(result.state).toEqual('xyz');
    });

    it('should validate against post_logout_redirect_uri, NOT redirect_uri (dedicated column)', async () => {
        // a client whose login redirect_uri would match but whose dedicated
        // post-logout allow-list does NOT — the redirect must be dropped
        const narrowClient: Client = {
            ...client,
            redirectUri: 'https://app.example.com/**',
            postLogoutRedirectUri: 'https://app.example.com/only-here/**',
        };
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => validPayload),
            sessionManager,
            clientRepository: { findOneByIdOrName: async () => narrowClient },
            realmRepository,
        });

        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: clientId,
            // matches redirect_uri but not post_logout_redirect_uri
            post_logout_redirect_uri: 'https://app.example.com/after-logout',
        });

        expect(result.redirectUri).toBeUndefined();
    });

    it('should DROP an unregistered post_logout_redirect_uri (open-redirect guard)', async () => {
        const service = buildService(async () => validPayload);
        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: clientId,
            post_logout_redirect_uri: 'https://evil.example.com/steal',
            state: 'xyz',
        });

        expect(result.redirectUri).toBeUndefined();
        expect(result.state).toBeUndefined();
    });

    it('should DROP a post_logout_redirect_uri carrying userinfo', async () => {
        // it would match once canonicalized (userinfo dropped), but the
        // Location is built from the raw value
        const service = buildService(async () => validPayload);
        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: clientId,
            post_logout_redirect_uri: 'https://user:secret@app.example.com/after-logout',
            state: 'xyz',
        });

        expect(result.redirectUri).toBeUndefined();
        expect(result.state).toBeUndefined();
    });

    it('should DROP a non-http(s) post_logout_redirect_uri', async () => {
        const service = buildService(async () => validPayload);
        const result = await service.verify({
            id_token_hint: 'valid',
            client_id: clientId,
            // eslint-disable-next-line no-script-url -- exercising the protocol guard
            post_logout_redirect_uri: 'javascript:alert(1)',
        });

        expect(result.redirectUri).toBeUndefined();
    });

    it('should revoke the session when it belongs to the subject', async () => {
        await sessionManager.create({
            id: sessionId,
            sub,
            subKind: OAuth2SubKind.USER,
            realmId,
        });

        const service = buildService(async () => validPayload);
        const revoked = await service.revoke(sessionId, sub, OAuth2SubKind.USER);

        expect(revoked).toBe(true);
        expect(sessionManager.revokeCalls).toContain(sessionId);

        expect(eventService.recordCalls).toHaveLength(1);
        expect(eventService.recordCalls[0].name).toEqual(EventName.LOGOUT);
        expect(eventService.recordCalls[0].refId).toEqual(sessionId);
        expect(eventService.recordCalls[0].sessionId).toEqual(sessionId);
        expect(eventService.recordCalls[0].data).toBeUndefined();
    });

    it('should NOT revoke a session belonging to another subject', async () => {
        await sessionManager.create({
            id: sessionId,
            sub: randomUUID(), // different subject
            subKind: OAuth2SubKind.USER,
            realmId,
        });

        const service = buildService(async () => validPayload);
        const revoked = await service.revoke(sessionId, sub, OAuth2SubKind.USER);

        expect(revoked).toBe(false);
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });
});
