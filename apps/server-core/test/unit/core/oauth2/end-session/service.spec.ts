/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, Realm } from '@authup/core-kit';
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
    IRealmRepository,
} from '../../../../../src/core/index.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

const realmId = randomUUID();
const clientId = randomUUID();

const client = {
    id: clientId,
    name: 'web',
    realm_id: realmId,
    redirect_uri: 'https://app.example.com/**',
    post_logout_redirect_uri: 'https://app.example.com/**',
} as Client;

const realmRepository = { resolve: async () => ({ id: realmId, name: 'master' } as Realm) } as unknown as IRealmRepository;

const clientRepository = { findOneByIdOrName: async () => client } as unknown as IOAuth2ClientRepository;

// A token-verifier stub whose behavior is set per test.
function buildVerifier(behavior: () => Promise<OAuth2TokenPayload>): IOAuth2TokenVerifier {
    return {
        isInactive: async () => false,
        verify: behavior,
    };
}

describe('OAuth2EndSessionService', () => {
    let sessionManager: FakeSessionManager;

    const sub = randomUUID();
    const sessionId = randomUUID();

    const validPayload: OAuth2TokenPayload = {
        kind: OAuth2TokenKind.ID_TOKEN,
        sub,
        sub_kind: OAuth2SubKind.USER,
        sid: sessionId,
        aud: clientId,
    };

    const buildService = (verify: () => Promise<OAuth2TokenPayload>) => new OAuth2EndSessionService({
        tokenVerifier: buildVerifier(verify),
        sessionManager,
        clientRepository,
        realmRepository,
    });

    beforeEach(() => {
        sessionManager = new FakeSessionManager();
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
        const narrowClient = {
            ...client,
            redirect_uri: 'https://app.example.com/**',
            post_logout_redirect_uri: 'https://app.example.com/only-here/**',
        } as Client;
        const service = new OAuth2EndSessionService({
            tokenVerifier: buildVerifier(async () => validPayload),
            sessionManager,
            clientRepository: { findOneByIdOrName: async () => narrowClient } as unknown as IOAuth2ClientRepository,
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
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
        });

        const service = buildService(async () => validPayload);
        const revoked = await service.revoke(sessionId, sub, OAuth2SubKind.USER);

        expect(revoked).toBe(true);
        expect(sessionManager.revokeCalls).toContain(sessionId);
    });

    it('should NOT revoke a session belonging to another subject', async () => {
        await sessionManager.create({
            id: sessionId,
            sub: randomUUID(), // different subject
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
        });

        const service = buildService(async () => validPayload);
        const revoked = await service.revoke(sessionId, sub, OAuth2SubKind.USER);

        expect(revoked).toBe(false);
        expect(sessionManager.revokeCalls).toHaveLength(0);
    });
});
