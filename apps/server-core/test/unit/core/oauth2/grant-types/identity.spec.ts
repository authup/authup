/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    Identity, Realm, Session, User,
} from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { IdentityGrantType } from '../../../../../src/core/oauth2/grant-types/identity.ts';
import type { IOAuth2TokenIssuer } from '../../../../../src/core/oauth2/token/issuer/types.ts';
import type { ISessionManager } from '../../../../../src/core/authentication/session/types.ts';

function createMockTokenIssuer(): IOAuth2TokenIssuer {
    const tokenId = randomUUID();
    return {
        issue: vi.fn().mockImplementation(async (input: OAuth2TokenPayload) => {
            const payload: OAuth2TokenPayload = {
                ...input,
                jti: tokenId,
                exp: Math.floor(Date.now() / 1000) + 3600,
            } as OAuth2TokenPayload;
            return [`signed-token-${tokenId}`, payload];
        }),
        buildExp: vi.fn().mockReturnValue(Math.floor(Date.now() / 1000) + 3600),
    };
}

function createMockSessionManager(): ISessionManager {
    const sessionId = randomUUID();
    return {
        create: vi.fn().mockImplementation(async (session: Partial<Session>) => ({
            id: sessionId,
            ...session,
        })),
        touch: vi.fn(),
        findById: vi.fn(),
    } as unknown as ISessionManager;
}

describe('IdentityGrantType', () => {
    let accessTokenIssuer: IOAuth2TokenIssuer;
    let refreshTokenIssuer: IOAuth2TokenIssuer;
    let sessionManager: ISessionManager;
    let grant: IdentityGrantType;

    const realmId = randomUUID();
    const userId = randomUUID();

    const identity: Identity = {
        type: OAuth2SubKind.USER,
        data: {
            id: userId,
            realm_id: realmId,
            realm: { id: realmId, name: 'master' } as Realm,
        } as User,
    };

    beforeEach(() => {
        accessTokenIssuer = createMockTokenIssuer();
        refreshTokenIssuer = createMockTokenIssuer();
        sessionManager = createMockSessionManager();
        grant = new IdentityGrantType({
            accessTokenIssuer,
            refreshTokenIssuer,
            sessionManager,
        });
    });

    it('should create a session with identity data', async () => {
        await grant.runWith(identity);

        expect(sessionManager.create).toHaveBeenCalledWith(
            expect.objectContaining({
                realm_id: realmId,
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            }),
        );
    });

    it('should pass userAgent and ipAddress to session', async () => {
        await grant.runWith(identity, {
            userAgent: 'TestAgent',
            ipAddress: '10.0.0.1',
        });

        expect(sessionManager.create).toHaveBeenCalledWith(
            expect.objectContaining({
                user_agent: 'TestAgent',
                ip_address: '10.0.0.1',
            }),
        );
    });

    it('should issue both access and refresh tokens', async () => {
        await grant.runWith(identity);

        expect(accessTokenIssuer.issue).toHaveBeenCalledWith(
            expect.objectContaining({
                scope: ScopeName.GLOBAL,
                realm_id: realmId,
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            }),
        );
        expect(refreshTokenIssuer.issue).toHaveBeenCalledWith(
            expect.objectContaining({
                scope: ScopeName.GLOBAL,
                realm_id: realmId,
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            }),
        );
    });

    it('should include realm_name in token payload', async () => {
        await grant.runWith(identity);

        expect(accessTokenIssuer.issue).toHaveBeenCalledWith(
            expect.objectContaining({
                realm_name: 'master',
            }),
        );
    });

    it('should return a bearer token response', async () => {
        const result = await grant.runWith(identity);

        expect(result).toHaveProperty('access_token');
        expect(result).toHaveProperty('token_type', 'Bearer');
        expect(result).toHaveProperty('expires_in');
        expect(result).toHaveProperty('refresh_token');
    });

    it('should include session_id in token payload', async () => {
        await grant.runWith(identity);

        expect(accessTokenIssuer.issue).toHaveBeenCalledWith(
            expect.objectContaining({
                session_id: expect.any(String),
            }),
        );
    });
});
