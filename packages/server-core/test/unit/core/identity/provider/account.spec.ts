/*
 * Copyright (c) 2024-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type { OAuth2IdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
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
    RoleRepository,
    UserIdentityRepository,
    UserPermissionEntity,
    UserRoleEntity,
    resolveRealm,
} from '../../../../../src';
import { createTestSuite } from '../../../../utils';

describe('core/identity/provider/account', () => {
    const suite = createTestSuite();

    let realm : Realm;

    let provider : OAuth2IdentityProvider;

    let accountManager : IdentityProviderAccountManager;

    let identity : IdentityProviderIdentity;

    beforeAll(async () => {
        await suite.up();

        realm = await resolveRealm('', true);

        const repository = new IdentityProviderRepository(suite.dataSource);
        provider = {
            authorize_url: '',
            token_url: '',
            name: 'keycloak',
            enabled: true,
            protocol: IdentityProviderProtocol.OAUTH2,
            client_id: 'client',
            client_secret: 'start123',
            realm_id: realm.id,
        } as OAuth2IdentityProvider;

        await repository.save(provider);

        identity = {
            id: 'foo',
            data: claims,
            attributeCandidates: {
                name: ['fooBarBaz'],
            },
            provider,
        };

        const attributeMapperRepository = new IdentityProviderAttributeMappingRepository();
        const attributeMapper = new IdentityProviderAttributeMapper(attributeMapperRepository);

        const roleMapperRepository = new IdentityProviderRoleMappingRepository();
        const roleMapper = new IdentityProviderRoleMapper(roleMapperRepository);

        const permissionMapperRepository = new IdentityProviderPermissionMappingRepository();
        const permissionMapper = new IdentityProviderPermissionMapper(permissionMapperRepository);

        const providerAccountRepository = new IdentityProviderAccountRepository();

        const userRepository = new UserIdentityRepository();

        accountManager = new IdentityProviderAccountManager({
            attributeMapper,
            roleMapper,
            permissionMapper,
            userRepository,
            repository: providerAccountRepository,
        });
    });

    afterAll(async () => {
        await suite.down();

        realm = undefined;
        accountManager = undefined;
    });

    it('should create user', async () => {
        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).toEqual('fooBarBaz');
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
        const role = roleRepository.create({
            name: createNanoID(),
        });

        await roleRepository.save(role);

        const idpRoleMappingRepository = suite.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const idpRoleMapping = idpRoleMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            role_id: role.id,
            role_realm_id: role.realm_id,
            provider_id: provider.id,
            provider_realm_id: provider.realm_id,
        });

        await idpRoleMappingRepository.save(idpRoleMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = suite.dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.find({
            where: {
                role_id: role.id,
                user_id: account.user_id,
            },
        });

        expect(userRole).toBeDefined();
    });

    it('should not synchronize roles', async () => {
        const roleRepository = new RoleRepository(suite.dataSource);
        const role = roleRepository.create({
            name: createNanoID(),
        });

        await roleRepository.save(role);

        const roleMappingRepository = suite.dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const roleMapping = roleMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            role_id: role.id,
            role_realm_id: role.realm_id,
            provider_id: provider.id,
            provider_realm_id: provider.realm_id,
        });

        await roleMappingRepository.save(roleMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = suite.dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.findOne({
            where: {
                role_id: role.id,
                user_id: account.user_id,
            },
        });

        expect(userRole).toEqual(null);
    });

    it('should synchronize permissions', async () => {
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({
            name: createNanoID(),
        });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = suite.dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
            provider_id: provider.id,
            provider_realm_id: provider.realm_id,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permission_id: permission.id,
                user_id: account.user_id,
            },
        });

        expect(userPermission).toBeDefined();

        await userPermissionRepository.remove(userPermission);
    });

    it('should not synchronize permissions', async () => {
        const permissionRepository = suite
            .dataSource
            .getRepository(PermissionEntity);

        const permission = permissionRepository.create({
            name: createNanoID(),
        });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = suite
            .dataSource
            .getRepository(IdentityProviderPermissionMappingEntity);

        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
            provider_id: provider.id,
            provider_realm_id: provider.realm_id,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await accountManager.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permission_id: permission.id,
                user_id: account.user_id,
            },
        });

        expect(userPermission).toEqual(null);
    });
});
