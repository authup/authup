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
} from 'vitest';
import type { OAuth2IdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol, buildUserFakeEmail } from '@authup/core-kit';
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
    IdentityProviderAccountRepository,
    IdentityProviderAttributeMappingRepository,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderPermissionMappingRepository,
    IdentityProviderRepository,
    IdentityProviderRoleMappingEntity,
    IdentityProviderRoleMappingRepository,
    PermissionEntity,
    RealmEntity,
    RoleRepository,
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

        const providerAccountRepository = new IdentityProviderAccountRepository(suite.dataSource);

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
            repository: providerAccountRepository,
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
});
