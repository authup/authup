/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type {
    Identity, Realm, User,
} from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWTError, OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { OAuth2OpenIDTokenIssuer } from '../../../../../../../src/core/oauth2/token/issuer/open-id/module.ts';
import type { IOAuth2TokenRepository } from '../../../../../../../src/core/oauth2/token/repository/types.ts';
import type { IOAuth2TokenSigner } from '../../../../../../../src/core/oauth2/token/signer/types.ts';
import type { IIdentityResolver } from '../../../../../../../src/core/identity/resolver/types.ts';

function createFakeTokenRepository(): IOAuth2TokenRepository {
    return {
        setInactive: vi.fn(),
        isInactive: vi.fn(),
        findOneById: vi.fn(),
        findOneBySignature: vi.fn(),
        removeById: vi.fn(),
        insert: vi.fn().mockImplementation(async (payload: OAuth2TokenPayload) => ({
            jti: randomUUID(),
            ...payload,
        })),
        save: vi.fn(),
        saveWithSignature: vi.fn(),
    };
}

function createFakeSigner(): IOAuth2TokenSigner {
    return {
        sign: vi.fn().mockResolvedValue('signed-id-token'),
    };
}

function createFakeIdentityResolver(identity: Identity | null = null): IIdentityResolver {
    return {
        resolve: vi.fn().mockResolvedValue(identity),
    };
}

describe('OAuth2OpenIDTokenIssuer', () => {
    const realmId = randomUUID();
    const userId = randomUUID();
    const clientId = randomUUID();

    const user: User = {
        id: userId,
        name: 'jdoe',
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        email: 'john@example.com',
        active: true,
        realm_id: realmId,
        realm: { id: realmId, name: 'master' } as Realm,
    } as User;

    const identity: Identity = {
        type: OAuth2SubKind.USER,
        data: user,
    };

    let repository: IOAuth2TokenRepository;
    let signer: IOAuth2TokenSigner;

    beforeEach(() => {
        repository = createFakeTokenRepository();
        signer = createFakeSigner();
    });

    describe('issue', () => {
        it('should throw when sub_kind is missing', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(identity),
            });

            await expect(issuer.issue({ sub: userId } as OAuth2TokenPayload)).rejects.toThrow(JWTError);
        });

        it('should throw when sub is missing', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(identity),
            });

            await expect(issuer.issue({ sub_kind: OAuth2SubKind.USER } as OAuth2TokenPayload)).rejects.toThrow(JWTError);
        });

        it('should throw when identity cannot be resolved', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(null),
            });

            await expect(issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            } as OAuth2TokenPayload)).rejects.toThrow(JWTError);
        });

        it('should resolve identity and issue token', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(identity),
            });

            const [token] = await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            } as OAuth2TokenPayload);

            expect(token).toBe('signed-id-token');
        });
    });

    describe('issueWithIdentity', () => {
        it('should insert token with ID_TOKEN kind', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(),
            });

            await issuer.issueWithIdentity(
                { sub: userId, realm_id: realmId } as OAuth2TokenPayload,
                identity,
            );

            expect(repository.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    kind: OAuth2TokenKind.ID_TOKEN,
                }),
            );
        });

        it('should include OpenID claims from identity', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(),
            });

            await issuer.issueWithIdentity(
                { sub: userId, realm_id: realmId } as OAuth2TokenPayload,
                identity,
            );

            expect(repository.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'jdoe',
                    given_name: 'John',
                    family_name: 'Doe',
                    email: 'john@example.com',
                }),
            );
        });

        it('should set auth_time as unix timestamp in seconds', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(),
            });

            const before = Math.floor(Date.now() / 1000);
            await issuer.issueWithIdentity(
                { sub: userId, realm_id: realmId } as OAuth2TokenPayload,
                identity,
            );
            const after = Math.floor(Date.now() / 1000);

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(insertCall.auth_time).toBeGreaterThanOrEqual(before);
            expect(insertCall.auth_time).toBeLessThanOrEqual(after);
        });

        it('should set iss from issuer option per OIDC §2 (REQUIRED)', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(),
                options: { issuer: 'https://auth.example.com' },
            });

            await issuer.issueWithIdentity(
                { sub: userId, realm_id: realmId, client_id: clientId } as OAuth2TokenPayload,
                identity,
            );

            expect(repository.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    iss: 'https://auth.example.com',
                }),
            );
        });

        it('should set aud to client_id per OIDC §2 (REQUIRED)', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(),
            });

            await issuer.issueWithIdentity(
                { sub: userId, realm_id: realmId, client_id: clientId } as OAuth2TokenPayload,
                identity,
            );

            expect(repository.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    aud: clientId,
                }),
            );
        });

        it('should sign the token and cache signature', async () => {
            const issuer = new OAuth2OpenIDTokenIssuer({
                repository,
                signer,
                identityResolver: createFakeIdentityResolver(),
            });

            const [token, payload] = await issuer.issueWithIdentity(
                { sub: userId, realm_id: realmId } as OAuth2TokenPayload,
                identity,
            );

            expect(token).toBe('signed-id-token');
            expect(signer.sign).toHaveBeenCalledWith(payload);
            expect(repository.saveWithSignature).toHaveBeenCalledWith(payload, 'signed-id-token');
        });
    });
});
