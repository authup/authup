/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    Identity,
    Realm,
    User,
} from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { IdentityGrantType } from '../../../../../src/core/oauth2/grant-types/identity.ts';
import { FakeOAuth2TokenIssuer } from '../../helpers/fake-oauth2-token-issuer.ts';
import { FakeSessionManager } from '../../helpers/fake-session-manager.ts';

describe('IdentityGrantType', () => {
    let accessTokenIssuer: FakeOAuth2TokenIssuer;
    let refreshTokenIssuer: FakeOAuth2TokenIssuer;
    let sessionManager: FakeSessionManager;
    let grant: IdentityGrantType;

    const realmId = randomUUID();
    const userId = randomUUID();

    const identity: Identity = {
        type: OAuth2SubKind.USER,
        data: {
            id: userId,
            realm_id: realmId,
            realm: {
                id: realmId,
                name: 'master',
            } as Realm,
        } as User,
    };

    beforeEach(() => {
        accessTokenIssuer = new FakeOAuth2TokenIssuer();
        refreshTokenIssuer = new FakeOAuth2TokenIssuer();
        sessionManager = new FakeSessionManager();
        grant = new IdentityGrantType({
            accessTokenIssuer,
            refreshTokenIssuer,
            sessionManager,
        });
    });

    it('should create session and issue both tokens with correct payload', async () => {
        const result = await grant.runWith(identity);

        expect(sessionManager.createCalls).toContainEqual(
            expect.objectContaining({
                realm_id: realmId,
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            }),
        );

        const expectedPayload = expect.objectContaining({
            scope: ScopeName.GLOBAL,
            realm_id: realmId,
            realm_name: 'master',
            sub: userId,
            sub_kind: OAuth2SubKind.USER,
            session_id: expect.any(String),
        });
        expect(accessTokenIssuer.issueCalls).toContainEqual(expectedPayload);
        expect(refreshTokenIssuer.issueCalls).toContainEqual(expectedPayload);

        expect(result).toHaveProperty('access_token');
        expect(result).toHaveProperty('token_type', 'Bearer');
        expect(result).toHaveProperty('expires_in');
        expect(result).toHaveProperty('refresh_token');
    });

    it('should pass userAgent and ipAddress to session', async () => {
        await grant.runWith(identity, {
            userAgent: 'TestAgent',
            ipAddress: '10.0.0.1',
        });

        expect(sessionManager.createCalls).toContainEqual(
            expect.objectContaining({
                user_agent: 'TestAgent',
                ip_address: '10.0.0.1',
            }),
        );
    });
});
