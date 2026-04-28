/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Role } from '@authup/core-kit';
import { OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { OAuth2AccessTokenIssuer } from '../../../../../../../src/core/oauth2/token/issuer/access/module.ts';
import { FakeIdentityRoleProvider } from '../../../../helpers/fake-identity-role-provider.ts';
import { FakeOAuth2TokenRepository } from '../../../../helpers/fake-oauth2-token-repository.ts';
import { FakeOAuth2TokenSigner } from '../../../../helpers/fake-oauth2-token-signer.ts';

describe('OAuth2AccessTokenIssuer', () => {
    const realmId = randomUUID();
    const userId = randomUUID();

    let repository: FakeOAuth2TokenRepository;
    let signer: FakeOAuth2TokenSigner;

    beforeEach(() => {
        repository = new FakeOAuth2TokenRepository();
        signer = new FakeOAuth2TokenSigner('signed-access-token');
    });

    describe('issue', () => {
        it('should insert with kind=ACCESS, sign, and persist', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer);

            const [token, payload] = await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            expect(token).toBe('signed-access-token');
            expect(repository.insertCalls).toContainEqual(
                expect.objectContaining({ kind: OAuth2TokenKind.ACCESS }),
            );
            expect(signer.signCalls).toContainEqual(payload);
            expect(repository.saveWithSignatureCalls).toContainEqual({ payload, signature: 'signed-access-token' });
        });

        it('should set iss to "<issuer>/realms/<realm_name>" when realm_name is present', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, { issuer: 'https://auth.example.com' });

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
                realm_name: 'master',
            });

            expect(repository.insertCalls[0].iss).toEqual('https://auth.example.com/realms/master');
        });

        it('should set iss to the configured issuer when no realm_name is given', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, { issuer: 'https://auth.example.com' });

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            });

            expect(repository.insertCalls[0].iss).toEqual('https://auth.example.com');
        });

        it('should strip a trailing slash from the configured issuer', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, { issuer: 'https://auth.example.com/' });

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
                realm_name: 'master',
            });

            expect(repository.insertCalls[0].iss).toEqual('https://auth.example.com/realms/master');
        });

        it('should strip a trailing slash from a sub-path issuer', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, { issuer: 'https://example.com/auth/' });

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_name: 'master',
            });

            expect(repository.insertCalls[0].iss).toEqual('https://example.com/auth/realms/master');
        });

        it('should omit iss when no issuer is configured', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_name: 'master',
            });

            expect(repository.insertCalls[0].iss).toBeUndefined();
        });

        it('should not add access claims when no role provider is supplied', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = repository.insertCalls[0];
            expect(insertCall.realm_access).toBeUndefined();
            expect(insertCall.global_access).toBeUndefined();
        });

        it('should not add access claims when sub or sub_kind is missing', async () => {
            const provider = new FakeIdentityRoleProvider([]);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({ realm_id: realmId });

            const insertCall = repository.insertCalls[0];
            expect(insertCall.realm_access).toBeUndefined();
            expect(insertCall.global_access).toBeUndefined();
            expect(provider.getRolesForCalls).toHaveLength(0);
        });

        it('should split roles by realm_id into realm_access and global_access', async () => {
            const roles: Role[] = [
                {
                    id: randomUUID(),
                    name: 'editor',
                    realm_id: realmId,
                } as Role,
                {
                    id: randomUUID(),
                    name: 'viewer',
                    realm_id: realmId,
                } as Role,
                {
                    id: randomUUID(),
                    name: 'admin',
                    realm_id: null,
                } as Role,
            ];
            const provider = new FakeIdentityRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = repository.insertCalls[0];
            expect(insertCall.realm_access).toEqual({ roles: ['editor', 'viewer'] });
            expect(insertCall.global_access).toEqual({ roles: ['admin'] });
        });

        it('should treat a role with no realm_id as global', async () => {
            const roles: Role[] = [
                { id: randomUUID(), name: 'system' } as Role,
            ];
            const provider = new FakeIdentityRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            });

            const insertCall = repository.insertCalls[0];
            expect(insertCall.global_access).toEqual({ roles: ['system'] });
            expect(insertCall.realm_access).toEqual({ roles: [] });
        });

        it('should drop roles bound to a different realm', async () => {
            const otherRealmId = randomUUID();
            const roles: Role[] = [
                {
                    id: randomUUID(),
                    name: 'editor',
                    realm_id: realmId,
                } as Role,
                {
                    id: randomUUID(),
                    name: 'foreign',
                    realm_id: otherRealmId,
                } as Role,
                {
                    id: randomUUID(),
                    name: 'admin',
                    realm_id: null,
                } as Role,
            ];
            const provider = new FakeIdentityRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = repository.insertCalls[0];
            expect(insertCall.realm_access).toEqual({ roles: ['editor'] });
            expect(insertCall.global_access).toEqual({ roles: ['admin'] });
        });

        it('should drop realm-bound roles when input has no realm_id', async () => {
            const roles: Role[] = [
                {
                    id: randomUUID(),
                    name: 'editor',
                    realm_id: realmId,
                } as Role,
                {
                    id: randomUUID(),
                    name: 'admin',
                    realm_id: null,
                } as Role,
            ];
            const provider = new FakeIdentityRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            });

            const insertCall = repository.insertCalls[0];
            expect(insertCall.realm_access).toEqual({ roles: [] });
            expect(insertCall.global_access).toEqual({ roles: ['admin'] });
        });

        it('should produce empty role arrays when identity has no roles', async () => {
            const provider = new FakeIdentityRoleProvider([]);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = repository.insertCalls[0];
            expect(insertCall.realm_access).toEqual({ roles: [] });
            expect(insertCall.global_access).toEqual({ roles: [] });
        });

        it('should pass identity context to the role provider', async () => {
            const provider = new FakeIdentityRoleProvider([]);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);
            const clientId = randomUUID();

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
                realm_name: 'master',
                client_id: clientId,
            });

            expect(provider.getRolesForCalls).toContainEqual({
                type: OAuth2SubKind.USER,
                id: userId,
                clientId,
                realmId,
                realmName: 'master',
            });
        });
    });
});
