/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
    vi,
} from 'vitest';
import type { OAuth2IdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol, buildUserFakeEmail } from '@authup/core-kit';
import { EntityConflictError } from '@authup/errors';
import { createNanoID } from '@authup/kit';
import type { IdentityProviderIdentity } from '../../../../../src/core';
import {
    IdentityProviderAccountManager,
    IdentityProviderAttributeMapper,
    IdentityProviderPermissionMapper,
    IdentityProviderRoleMapper,
} from '../../../../../src/core';
import claims from '../../../../data/jwt.json';
import {
    IdentityProviderAccountEntity,
    IdentityProviderAccountRepositoryAdapter,
    IdentityProviderAttributeMappingEntity,
    IdentityProviderAttributeMappingRepository,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderPermissionMappingRepository,
    IdentityProviderRepository,
    IdentityProviderRoleMappingEntity,
    IdentityProviderRoleMappingRepository,
    PermissionEntity,
    RealmEntity,
    RoleRepository,
    UserEntity,
    UserIdentityRepository,
    UserPermissionEntity,
    UserRepository,
    UserRoleEntity,
} from '../../../../../src';
import { RealmRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/realm/repository';
import { createTestApplication } from '../../../../app';

describe('core/identity/provider/account', () => {
    const suite = createTestApplication();

    let realm : Realm;

    let provider : OAuth2IdentityProvider;

    let accountManager : IdentityProviderAccountManager;

    let accountRepository : IdentityProviderAccountRepositoryAdapter;

    let identity : IdentityProviderIdentity;

    beforeAll(async () => {
        await suite.setup();

        const realmRepository = new RealmRepositoryAdapter(
            suite.dataSource.getRepository(RealmEntity),
        );
        realm = await realmRepository.resolve('', true);

        const repository = new IdentityProviderRepository(suite.dataSource);
        provider = {
            authorizeUrl: '',
            tokenUrl: '',
            name: 'keycloak',
            enabled: true,
            protocol: IdentityProviderProtocol.OAUTH2,
            clientId: 'client',
            clientSecret: 'start123',
            realmId: realm.id,
        } as OAuth2IdentityProvider;

        await repository.save(provider);

        identity = {
            id: 'foo',
            data: claims,
            attributeCandidates: { name: ['fooBarBaz'] },
            provider,
        };

        const attributeMapperRepository = new IdentityProviderAttributeMappingRepository(suite.dataSource);
        const attributeMapper = new IdentityProviderAttributeMapper(attributeMapperRepository);

        const roleMapperFinder = new IdentityProviderRoleMappingRepository(suite.dataSource);
        const roleMapper = new IdentityProviderRoleMapper(roleMapperFinder);

        const permissionMapperRepository = new IdentityProviderPermissionMappingRepository(suite.dataSource);
        const permissionMapper = new IdentityProviderPermissionMapper(permissionMapperRepository);

        accountRepository = new IdentityProviderAccountRepositoryAdapter(suite.dataSource);

        const userRepository = new UserIdentityRepository({
            repository: new UserRepository(suite.dataSource),
            userPermissionRepository: suite.dataSource.getRepository(UserPermissionEntity),
            userRoleRepository: suite.dataSource.getRepository(UserRoleEntity),
        });

        accountManager = new IdentityProviderAccountManager({
            attributeMapper,
            roleMapper,
            permissionMapper,
            userRepository,
            repository: accountRepository,
        });
    });

    afterAll(async () => {
        await suite.teardown();

        realm = undefined as unknown as Realm;
        accountManager = undefined as unknown as IdentityProviderAccountManager;
    });

    it('should create user', async () => {
        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).toEqual('foobarbaz');
        expect(account.user.email).toEqual(buildUserFakeEmail('foobarbaz'));
    });

    it('should create user with alternative name', async () => {
        const account = await accountManager.save({
            data: claims,
            id: 'bar',
            attributeCandidates: {
                name: [
                    'admin', // exists
                    '', // invalid due validation rules
                    'bar', // valid
                ],
            },
            provider,
        });

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).toEqual('bar');
        expect(account.user.email).toEqual(buildUserFakeEmail('bar'));
    });

    it('should create user with random name', async () => {
        const account = await accountManager.save({
            data: claims,
            id: 'baz',
            attributeCandidates: {
                name: [
                    'admin', // exists
                ],
            },
            provider,
        });

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).not.toEqual('admin');
    });

    it('should create user only once', async () => {
        let account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const accountId = account.id;
        const userId = account.user.id;

        account = await accountManager.save(identity);
        expect(account).toBeDefined();

        expect(account.id).toEqual(accountId);
        expect(account.user.id).toEqual(userId);
    });

    it('should keep one external identity on one user', async () => {
        const account = await accountManager.save(identity);
        // a user without any link, so only the (providerUserId, providerId)
        // index can reject
        const userRepository = suite.dataSource.getRepository(UserEntity);
        const other = await userRepository.save(userRepository.create({
            name: 'qux', 
            email: buildUserFakeEmail('qux'), 
            realmId: realm.id,
        }));

        // straight through the adapter, past the manager's own pre-check:
        // the unique index answers, translated into the domain conflict
        await expect(accountRepository.save({
            providerId: provider.id,
            providerUserId: identity.id,
            providerRealmId: provider.realmId,
            userId: other.id,
            userRealmId: other.realmId,
        })).rejects.toBeInstanceOf(EntityConflictError);

        const linked = await accountRepository.findOneByProviderIdentity(identity);
        expect(linked?.id).toEqual(account.id);
        expect(linked?.userId).toEqual(account.user.id);
    });

    it('should converge the loser of two concurrent first logins onto the winner', async () => {
        const buildRacer = () : IdentityProviderIdentity => ({
            data: claims,
            id: 'racer',
            attributeCandidates: { name: ['racer'] },
            provider,
        });
        const winner = await accountManager.save(buildRacer());

        const users = suite.dataSource.getRepository(UserEntity);
        const accounts = suite.dataSource.getRepository(IdentityProviderAccountEntity);
        const usersBefore = await users.count();

        // the loser read "not linked" before the winner's insert landed; only
        // the unique index sees the winner
        vi.spyOn(accountRepository, 'findOneByProviderIdentity').mockResolvedValueOnce(null);
        const loser = await accountManager.save(buildRacer());

        expect(loser.id).toEqual(winner.id);
        expect(loser.user.id).toEqual(winner.user.id);
        expect(await accounts.countBy({ providerId: provider.id, providerUserId: 'racer' })).toEqual(1);
        // the user the loser provisioned is gone again
        expect(await users.count()).toEqual(usersBefore);
    });

    it('should synchronize roles', async () => {
        const roleRepository = new RoleRepository(suite.dataSource);
        const role = roleRepository.create({ name: createNanoID() });

        await roleRepository.save(role);

        const idpRoleMappingRepository = suite.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const idpRoleMapping = idpRoleMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            roleId: role.id,
            roleRealmId: role.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await idpRoleMappingRepository.save(idpRoleMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = suite.dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.find({
            where: {
                roleId: role.id,
                userId: account.userId,
            },
        });

        expect(userRole).toBeDefined();
    });

    it('should not synchronize roles', async () => {
        const roleRepository = new RoleRepository(suite.dataSource);
        const role = roleRepository.create({ name: createNanoID() });

        await roleRepository.save(role);

        const roleMappingRepository = suite.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const roleMapping = roleMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            roleId: role.id,
            roleRealmId: role.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await roleMappingRepository.save(roleMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = suite.dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.findOne({
            where: {
                roleId: role.id,
                userId: account.userId,
            },
        });

        expect(userRole).toEqual(null);
    });

    it('should synchronize permissions', async () => {
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({ name: createNanoID() });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = suite.dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permissionId: permission.id,
                userId: account.userId,
            },
        });

        expect(userPermission).toBeDefined();

        await userPermissionRepository.remove(userPermission!);
    });

    it('should not synchronize permissions', async () => {
        const permissionRepository = suite
            .dataSource
            .getRepository(PermissionEntity);

        const permission = permissionRepository.create({ name: createNanoID() });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = suite
            .dataSource
            .getRepository(IdentityProviderPermissionMappingEntity);

        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronizationMode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
            providerId: provider.id,
            providerRealmId: provider.realmId,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permissionId: permission.id,
                userId: account.userId,
            },
        });

        expect(userPermission).toEqual(null);
    });

    it('should clear emailVerified when a mapped address differs from the stored one', async () => {
        const mappings = suite.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const mapping = await mappings.save(mappings.create({
            synchronizationMode: 'always',
            targetName: 'email',
            targetValue: 'mapped@example.com',
            providerId: provider.id,
            providerRealmId: provider.realmId,
        }));

        const buildIdentity = () : IdentityProviderIdentity => ({
            data: claims,
            id: 'mailer',
            attributeCandidates: { name: ['mailer'] },
            provider,
        });
        const created = await accountManager.save(buildIdentity());
        expect(created.user.email).toEqual('mapped@example.com');

        // the address was changed and vouched for in authup meanwhile
        const users = suite.dataSource.getRepository(UserEntity);
        await users.update(created.user.id, { email: 'verified@example.com', emailVerified: true });

        await accountManager.save(buildIdentity());

        const row = await users.findOne({
            where: { id: created.user.id },
            select: {
                id: true, 
                email: true, 
                emailVerified: true, 
            },
        });
        expect(row?.email).toEqual('mapped@example.com');
        expect(row?.emailVerified).toEqual(false);

        await mappings.remove(mapping);
    });

    it('should keep emailVerified when the mapped address matches the stored one', async () => {
        const mappings = suite.dataSource.getRepository(IdentityProviderAttributeMappingEntity);
        const mapping = await mappings.save(mappings.create({
            synchronizationMode: 'always',
            targetName: 'email',
            targetValue: 'same@example.com',
            providerId: provider.id,
            providerRealmId: provider.realmId,
        }));

        const buildIdentity = () : IdentityProviderIdentity => ({
            data: claims,
            id: 'mailer-same',
            attributeCandidates: { name: ['mailer-same'] },
            provider,
        });
        const created = await accountManager.save(buildIdentity());

        const users = suite.dataSource.getRepository(UserEntity);
        await users.update(created.user.id, { emailVerified: true });

        await accountManager.save(buildIdentity());

        const row = await users.findOne({
            where: { id: created.user.id },
            select: {
                id: true,
                email: true,
                emailVerified: true,
            },
        });
        expect(row?.email).toEqual('same@example.com');
        expect(row?.emailVerified).toEqual(true);

        await mappings.remove(mapping);
    });
});
