/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2AuthorizeGrant } from '../../../../../src/core/oauth2/grant-types/authorize.ts';
import { FakeOAuth2TokenIssuer } from '../../helpers/fake-oauth2-token-issuer.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

describe('OAuth2AuthorizeGrant', () => {
    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let refreshTokenIssuer: FakeOAuth2TokenIssuer;
    let sessionManager: FakeSessionManager;
    let grant: OAuth2AuthorizeGrant;

    const realmId = randomUUID();
    const userId = randomUUID();
    const clientId = randomUUID();

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
        sessionManager = new FakeSessionManager();
        grant = new OAuth2AuthorizeGrant({
            accessTokenIssuer,
            refreshTokenIssuer,
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
                realm_id: realmId,
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                client_id: clientId,
                user_agent: 'TestAgent',
                ip_address: '10.0.0.1',
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
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
            client_id: null,
        });
        sessionManager.createCalls.length = 0;

        const result = await grant.runWith(buildCode({ session_id: sessionId }));

        // no second session created
        expect(sessionManager.createCalls).toHaveLength(0);
        expect(sessionManager.findOneByIdCalls).toContain(sessionId);
        expect(sessionManager.refreshCalls).toHaveLength(1);
        // the reused session gets the authorize client stamped onto it
        expect(sessionManager.refreshCalls[0]).toEqual(
            expect.objectContaining({ id: sessionId, client_id: clientId }),
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
            sub_kind: OAuth2SubKind.USER,
            realm_id: realmId,
            client_id: null,
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
            sub_kind: OAuth2SubKind.USER,
            realm_id: randomUUID(), // different realm
            client_id: null,
        });
        sessionManager.createCalls.length = 0;

        await grant.runWith(buildCode({ session_id: sessionId }));

        expect(sessionManager.refreshCalls).toHaveLength(0);
        expect(sessionManager.createCalls).toHaveLength(1);
    });
});
