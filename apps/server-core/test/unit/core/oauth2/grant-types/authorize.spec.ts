/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key, OAuth2AuthorizationCode } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import {
    JWKType, 
    JWKUse, 
    JWTAlgorithm, 
    OAuth2SubKind,
} from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2AuthorizeGrant } from '../../../../../src/core/oauth2/grant-types/authorize.ts';
import { FakeKeyStore } from '../../helpers/fake-key-store.ts';
import { FakeOAuth2OpenIDTokenIssuer } from '../../helpers/fake-oauth2-openid-token-issuer.ts';
import { FakeOAuth2TokenIssuer } from '../../helpers/fake-oauth2-token-issuer.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

describe('OAuth2AuthorizeGrant', () => {
    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let refreshTokenIssuer: FakeOAuth2TokenIssuer;
    let openIdTokenIssuer: FakeOAuth2OpenIDTokenIssuer;
    let keyStore: FakeKeyStore;
    let sessionManager: FakeSessionManager;
    let grant: OAuth2AuthorizeGrant;

    const realmId = randomUUID();
    const userId = randomUUID();
    const clientId = randomUUID();

    // the realm signing key the id_token's at_hash digest derives from
    const buildKey = (): Key => ({
        id: randomUUID(),
        name: 'sig-test',
        type: JWKType.RSA,
        use: JWKUse.SIGNATURE,
        status: 'active',
        signatureAlgorithm: JWTAlgorithm.RS256,
        priority: 0,
        decryptionKey: 'rsa-private-key',
        encryptionKey: 'rsa-public-key',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        realmId,
        realm: {
            id: realmId,
            name: 'master',
            displayName: null,
            description: null,
            builtIn: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    });

    const buildCode = (
        overrides: Partial<OAuth2AuthorizationCode> = {},
    ): OAuth2AuthorizationCode => ({
        id: randomUUID(),
        sub: userId,
        sub_kind: OAuth2SubKind.USER,
        realm_id: realmId,
        realm_name: 'master',
        client_id: clientId,
        scope: ScopeName.GLOBAL,
        ...overrides,
    });

    beforeEach(() => {
        accessTokenIssuer = new FakeOAuth2TokenIssuer();
        refreshTokenIssuer = new FakeOAuth2TokenIssuer();
        openIdTokenIssuer = new FakeOAuth2OpenIDTokenIssuer();
        keyStore = new FakeKeyStore(buildKey());
        sessionManager = new FakeSessionManager();
        grant = new OAuth2AuthorizeGrant({
            accessTokenIssuer,
            refreshTokenIssuer,
            openIdTokenIssuer,
            keyStore,
            sessionManager,
        });
    });

    it('should create a fresh session when the code carries no session_id', async () => {
        const result = await grant.runWith(buildCode(), {
            userAgent: 'TestAgent',
            ipAddress: '10.0.0.1',
        });

        expect(sessionManager.createCalls).toHaveLength(1);
        expect(sessionManager.refreshCalls).toHaveLength(0);
        expect(sessionManager.findOneByIdCalls).toHaveLength(0);
        expect(sessionManager.createCalls[0]).toEqual(
            expect.objectContaining({
                realmId,
                sub: userId,
                subKind: OAuth2SubKind.USER,
                clientId,
                userAgent: 'TestAgent',
                ipAddress: '10.0.0.1',
            }),
        );

        expect(result).toHaveProperty('access_token');
        expect(result).toHaveProperty('refresh_token');
    });

    it('should reuse the bearer session when the code carries a matching session_id', async () => {
        const sessionId = randomUUID();
        // pre-seed a client-less bearer session (as created by the SSR password grant)
        await sessionManager.create({
            id: sessionId,
            sub: userId,
            subKind: OAuth2SubKind.USER,
            realmId,
            clientId: null,
        });
        sessionManager.createCalls.length = 0;

        const result = await grant.runWith(buildCode({ session_id: sessionId }));

        // no second session created
        expect(sessionManager.createCalls).toHaveLength(0);
        expect(sessionManager.findOneByIdCalls).toContain(sessionId);
        expect(sessionManager.refreshCalls).toHaveLength(1);
        // the reused session gets the authorize client stamped onto it
        expect(sessionManager.refreshCalls[0]).toEqual(
            expect.objectContaining({ id: sessionId, clientId }),
        );

        // the issued tokens reference the reused session
        const payload = expect.objectContaining({ session_id: sessionId });
        expect(accessTokenIssuer.issueCalls).toContainEqual(payload);
        expect(refreshTokenIssuer.issueCalls).toContainEqual(payload);

        expect(result).toHaveProperty('access_token');
    });

    it('should fall back to create when the referenced session does not exist', async () => {
        await grant.runWith(buildCode({ session_id: randomUUID() }));

        expect(sessionManager.createCalls).toHaveLength(1);
        expect(sessionManager.refreshCalls).toHaveLength(0);
    });

    it('should fall back to create when the referenced session belongs to another subject', async () => {
        const sessionId = randomUUID();
        await sessionManager.create({
            id: sessionId,
            sub: randomUUID(), // different subject
            subKind: OAuth2SubKind.USER,
            realmId,
            clientId: null,
        });
        sessionManager.createCalls.length = 0;

        await grant.runWith(buildCode({ session_id: sessionId }));

        expect(sessionManager.refreshCalls).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(1);
    });

    it('should fall back to create when the referenced session belongs to another realm', async () => {
        const sessionId = randomUUID();
        await sessionManager.create({
            id: sessionId,
            sub: userId,
            subKind: OAuth2SubKind.USER,
            realmId: randomUUID(), // different realm
            clientId: null,
        });
        sessionManager.createCalls.length = 0;

        await grant.runWith(buildCode({ session_id: sessionId }));

        expect(sessionManager.refreshCalls).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(1);
    });

    // plan 042 item 6: the id_token is minted at the exchange (not at authorize)
    // so its `sid` references the REAL backing session in every branch.

    it('should not mint an id_token when the code lacks the openid scope', async () => {
        const result = await grant.runWith(buildCode({ scope: ScopeName.GLOBAL }));

        expect(openIdTokenIssuer.issueCalls).toHaveLength(0);
        expect(result).not.toHaveProperty('id_token');
    });

    it('should mint an id_token with sid = the reused session for an openid code', async () => {
        const sessionId = randomUUID();
        await sessionManager.create({
            id: sessionId,
            sub: userId,
            subKind: OAuth2SubKind.USER,
            realmId,
            clientId: null,
        });
        sessionManager.createCalls.length = 0;

        const authTime = Math.floor(Date.now() / 1000) - 42;
        const result = await grant.runWith(buildCode({
            session_id: sessionId,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            nonce: 'n-123',
            auth_time: authTime,
        }));

        expect(openIdTokenIssuer.issueCalls).toHaveLength(1);
        const idTokenPayload = openIdTokenIssuer.issueCalls[0];
        // sid is the REUSED session, not the code's session_id by coincidence
        expect(idTokenPayload.sid).toEqual(sessionId);
        expect(idTokenPayload.auth_time).toEqual(authTime);
        expect(idTokenPayload.nonce).toEqual('n-123');
        expect(idTokenPayload.at_hash).toBeDefined();
        expect(result).toHaveProperty('id_token');
    });

    it('should mint an id_token with sid = the freshly-created session on fallback', async () => {
        // session_id references a deleted session → resolveSession creates a new
        // one; the id_token's sid must be that NEW session, not the stale code id
        const staleSessionId = randomUUID();

        const result = await grant.runWith(buildCode({
            session_id: staleSessionId,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
        }));

        expect(sessionManager.createCalls).toHaveLength(1);
        expect(openIdTokenIssuer.issueCalls).toHaveLength(1);
        const idTokenPayload = openIdTokenIssuer.issueCalls[0];
        expect(idTokenPayload.sid).toBeDefined();
        expect(idTokenPayload.sid).not.toEqual(staleSessionId);
        expect(result).toHaveProperty('id_token');
    });

    it('should mint an id_token for a session-less (federated) openid code', async () => {
        // no session_id at all (external-IdP callback) → fresh session, and the
        // id_token is minted with that session's sid (previously: no id_token)
        const result = await grant.runWith(buildCode({ scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}` }));

        expect(sessionManager.createCalls).toHaveLength(1);
        expect(openIdTokenIssuer.issueCalls).toHaveLength(1);
        expect(openIdTokenIssuer.issueCalls[0].sid).toBeDefined();
        expect(result).toHaveProperty('id_token');
    });

    it('should derive the at_hash digest from the realm signing key alg (OIDC Core §3.1.3.6)', async () => {
        // RS256 key → SHA-256 left half (16 bytes → 22 base64url chars)
        await grant.runWith(buildCode({ scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}` }));

        expect(keyStore.resolveOrCreateCalls).toEqual([{ realmId, use: JWKUse.SIGNATURE }]);
        expect(openIdTokenIssuer.issueCalls[0].at_hash).toHaveLength(22);

        // RS512 key → SHA-512 left half (32 bytes → 43 base64url chars)
        keyStore.setKey({ ...buildKey(), signatureAlgorithm: JWTAlgorithm.RS512 });
        openIdTokenIssuer.issueCalls.length = 0;

        await grant.runWith(buildCode({ scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}` }));

        expect(openIdTokenIssuer.issueCalls[0].at_hash).toHaveLength(43);
    });

    it('should fail closed when no signing key can be resolved for the code realm', async () => {
        keyStore.setKey(null);

        await expect(
            grant.runWith(buildCode({ scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}` })),
        ).rejects.toThrow(/no active sig key/i);
    });
    // plan 050: amr/acr derive from the RESOLVED session; auth_method inherits
    // through the code blob on fallback-create.

    it('should inherit auth_method from the code blob on fallback-create', async () => {
        await grant.runWith(buildCode({ auth_method: 'ext' }));

        expect(sessionManager.createCalls[0]).toEqual(
            expect.objectContaining({ authMethod: 'ext' }),
        );
    });

    it('should mint amr/acr from the reused session (password login)', async () => {
        const sessionId = randomUUID();
        await sessionManager.create({
            id: sessionId,
            sub: userId,
            subKind: OAuth2SubKind.USER,
            realmId,
            clientId: null,
            authMethod: 'pwd',
            mfaAt: null,
        });

        await grant.runWith(buildCode({
            session_id: sessionId,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
        }));

        const claims = expect.objectContaining({ amr: ['pwd'], acr: 'urn:authup:pwd' });
        expect(openIdTokenIssuer.issueCalls).toContainEqual(claims);
        // deliberately on the access token too
        expect(accessTokenIssuer.issueCalls).toContainEqual(claims);
    });

    it('should mint the mfa acr once the session carries a second-factor proof', async () => {
        const sessionId = randomUUID();
        await sessionManager.create({
            id: sessionId,
            sub: userId,
            subKind: OAuth2SubKind.USER,
            realmId,
            clientId: null,
            authMethod: 'pwd',
            mfaAt: new Date().toISOString(),
        });

        await grant.runWith(buildCode({
            session_id: sessionId,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
        }));

        expect(openIdTokenIssuer.issueCalls).toContainEqual(
            expect.objectContaining({ amr: ['pwd', 'otp'], acr: 'urn:authup:mfa' }),
        );
    });

    it('should mint no amr/acr for a pre-column session (null auth_method)', async () => {
        const sessionId = randomUUID();
        await sessionManager.create({
            id: sessionId,
            sub: userId,
            subKind: OAuth2SubKind.USER,
            realmId,
            clientId: null,
        });

        await grant.runWith(buildCode({
            session_id: sessionId,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
        }));

        const [payload] = openIdTokenIssuer.issueCalls;
        expect(payload).not.toHaveProperty('amr');
        expect(payload).not.toHaveProperty('acr');
    });
});
