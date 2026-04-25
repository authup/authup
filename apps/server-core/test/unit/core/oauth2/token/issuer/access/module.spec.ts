/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Role } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2SubKind, OAuth2TokenKind } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { OAuth2AccessTokenIssuer } from '../../../../../../../src/core/oauth2/token/issuer/access/module.ts';
import type { IOAuth2TokenRepository } from '../../../../../../../src/core/oauth2/token/repository/types.ts';
import type { IOAuth2TokenSigner } from '../../../../../../../src/core/oauth2/token/signer/types.ts';
import type { IIdentityRoleProvider } from '../../../../../../../src/core/identity/permission/types.ts';

function createTokenRepo(): IOAuth2TokenRepository {
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

function createRoleProvider(roles: Role[]): IIdentityRoleProvider {
    return { getRolesFor: vi.fn().mockResolvedValue(roles) };
}

describe('OAuth2AccessTokenIssuer', () => {
    const realmId = randomUUID();
    const userId = randomUUID();

    let repository: IOAuth2TokenRepository;
    let signer: IOAuth2TokenSigner;

    beforeEach(() => {
        repository = createTokenRepo();
        signer = { sign: vi.fn().mockResolvedValue('signed-access-token') };
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
            expect(repository.insert).toHaveBeenCalledWith(
                expect.objectContaining({ kind: OAuth2TokenKind.ACCESS }),
            );
            expect(signer.sign).toHaveBeenCalledWith(payload);
            expect(repository.saveWithSignature).toHaveBeenCalledWith(payload, 'signed-access-token');
        });

        it('should not add access claims when no role provider is supplied', async () => {
            const issuer = new OAuth2AccessTokenIssuer(repository, signer);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(insertCall.realm_access).toBeUndefined();
            expect(insertCall.global_access).toBeUndefined();
        });

        it('should not add access claims when sub or sub_kind is missing', async () => {
            const provider = createRoleProvider([]);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({ realm_id: realmId });

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(insertCall.realm_access).toBeUndefined();
            expect(insertCall.global_access).toBeUndefined();
            expect(provider.getRolesFor).not.toHaveBeenCalled();
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
            const provider = createRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(insertCall.realm_access).toEqual({ roles: ['editor', 'viewer'] });
            expect(insertCall.global_access).toEqual({ roles: ['admin'] });
        });

        it('should treat a role with no realm_id as global', async () => {
            const roles: Role[] = [
                { id: randomUUID(), name: 'system' } as Role,
            ];
            const provider = createRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            });

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
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
            const provider = createRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
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
            const provider = createRoleProvider(roles);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
            });

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(insertCall.realm_access).toEqual({ roles: [] });
            expect(insertCall.global_access).toEqual({ roles: ['admin'] });
        });

        it('should produce empty role arrays when identity has no roles', async () => {
            const provider = createRoleProvider([]);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
            });

            const insertCall = (repository.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(insertCall.realm_access).toEqual({ roles: [] });
            expect(insertCall.global_access).toEqual({ roles: [] });
        });

        it('should pass identity context to the role provider', async () => {
            const provider = createRoleProvider([]);
            const issuer = new OAuth2AccessTokenIssuer(repository, signer, {}, provider);
            const clientId = randomUUID();

            await issuer.issue({
                sub: userId,
                sub_kind: OAuth2SubKind.USER,
                realm_id: realmId,
                realm_name: 'master',
                client_id: clientId,
            });

            expect(provider.getRolesFor).toHaveBeenCalledWith({
                type: OAuth2SubKind.USER,
                id: userId,
                clientId,
                realmId,
                realmName: 'master',
            });
        });
    });
});
