/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Identity, Realm, User } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWTError, OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2OpenIDTokenIssuer } from '../../../../../../../src/core/oauth2/token/issuer/open-id/module.ts';
import type { OAuth2OpenIDTokenIssuerContext } from '../../../../../../../src/core/oauth2/token/issuer/open-id/types.ts';
import { FakeIdentityResolver } from '../../../../helpers/fake-identity-resolver.ts';
import { FakeOAuth2TokenRepository } from '../../../../helpers/fake-oauth2-token-repository.ts';
import { FakeOAuth2TokenSigner } from '../../../../helpers/fake-oauth2-token-signer.ts';

describe('OAuth2OpenIDTokenIssuer', () => {
    const realmId = randomUUID();
    const userId = randomUUID();
    const clientId = randomUUID();

    const user = {
        id: userId,
        name: 'jdoe',
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        email: 'john@example.com',
        active: true,
        realm_id: realmId,
        realm: {
            id: realmId,
            name: 'master',
        } as Realm,
    } as User;

    const identity: Identity = {
        type: OAuth2SubKind.USER,
        data: user,
    };

    let repository: FakeOAuth2TokenRepository;
    let signer: FakeOAuth2TokenSigner;

    function createIssuer(overrides: Partial<OAuth2OpenIDTokenIssuerContext> = {}) {
        return new OAuth2OpenIDTokenIssuer({
            repository,
            signer,
            identityResolver: new FakeIdentityResolver(),
            ...overrides,
        });
    }

    beforeEach(() => {
        repository = new FakeOAuth2TokenRepository();
        signer = new FakeOAuth2TokenSigner('signed-id-token');
    });

    describe('issue', () => {
        it('should throw when sub_kind or sub is missing', async () => {
            const resolver = new FakeIdentityResolver();
            resolver.setIdentity(identity);
            const issuer = createIssuer({ identityResolver: resolver });

            await expect(issuer.issue({ sub: userId } as OAuth2TokenPayload)).rejects.toThrow(JWTError);
            await expect(issuer.issue({ sub_kind: OAuth2SubKind.USER } as OAuth2TokenPayload)).rejects.toThrow(JWTError);
        });

        it('should throw when identity cannot be resolved', async () => {
            const issuer = createIssuer();

            await expect(issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            } as OAuth2TokenPayload)).rejects.toThrow(JWTError);
        });

        it('should resolve identity and issue token', async () => {
            const resolver = new FakeIdentityResolver();
            resolver.setIdentity(identity);
            const issuer = createIssuer({ identityResolver: resolver });

            const [token] = await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            } as OAuth2TokenPayload);
            expect(token).toBe('signed-id-token');
        });
    });

    describe('issueWithIdentity', () => {
        it('should insert token with correct kind, claims, and timestamps', async () => {
            const issuer = createIssuer();
            const before = Math.floor(Date.now() / 1000);

            await issuer.issueWithIdentity(
                {
                    sub: userId,
                    realm_id: realmId,
                } as OAuth2TokenPayload,
                identity,
            );

            const insertCall = repository.insertCalls[0];
            expect(insertCall.kind).toBe(OAuth2TokenKind.ID_TOKEN);
            expect(insertCall.name).toBe('jdoe');
            expect(insertCall.given_name).toBe('John');
            expect(insertCall.family_name).toBe('Doe');
            expect(insertCall.email).toBe('john@example.com');
            expect(insertCall.auth_time).toBeGreaterThanOrEqual(before);
            expect(insertCall.auth_time).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
        });

        it('should set realm-scoped iss from issuer option per OIDC §2', async () => {
            const issuer = createIssuer({ options: { issuer: 'https://auth.example.com' } });

            await issuer.issueWithIdentity(
                {
                    sub: userId,
                    realm_id: realmId,
                    realm_name: 'master',
                    client_id: clientId,
                } as OAuth2TokenPayload,
                identity,
            );

            expect(repository.insertCalls).toContainEqual(
                expect.objectContaining({ iss: 'https://auth.example.com/realms/master' }),
            );
        });

        it('should fall back to base issuer when realm_name is not present', async () => {
            const issuer = createIssuer({ options: { issuer: 'https://auth.example.com' } });

            await issuer.issueWithIdentity(
                {
                    sub: userId,
                    realm_id: realmId,
                    client_id: clientId,
                } as OAuth2TokenPayload,
                identity,
            );

            expect(repository.insertCalls).toContainEqual(
                expect.objectContaining({ iss: 'https://auth.example.com' }),
            );
        });

        it('should set aud to client_id per OIDC §2', async () => {
            const issuer = createIssuer();

            await issuer.issueWithIdentity(
                {
                    sub: userId,
                    realm_id: realmId,
                    client_id: clientId,
                } as OAuth2TokenPayload,
                identity,
            );

            expect(repository.insertCalls).toContainEqual(
                expect.objectContaining({ aud: clientId }),
            );
        });

        it('should sign the token and cache signature', async () => {
            const issuer = createIssuer();

            const [token, payload] = await issuer.issueWithIdentity(
                {
                    sub: userId,
                    realm_id: realmId,
                } as OAuth2TokenPayload,
                identity,
            );

            expect(token).toBe('signed-id-token');
            expect(signer.signCalls).toContainEqual(payload);
            expect(repository.saveWithSignatureCalls).toContainEqual({ payload, signature: 'signed-id-token' });
        });
    });
});
