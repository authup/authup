/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, OAuth2IdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import type { DataSource } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { undefined } from 'zod';
import claims from '../../data/jwt.json';
import type { IdentityProviderIdentity } from '../../../src';
import {
    IDPAccountService,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRepository,
    IdentityProviderRoleMappingEntity,
    PermissionEntity,
    RoleRepository,
    UserPermissionEntity,
    UserRoleEntity,
    resolveRealm,
} from '../../../src';
import { setupTestConfig } from '../../utils/config';
import { dropTestDatabase, useTestDatabase } from '../../utils/database/connection';

describe('idp-manager-service', () => {
    let dataSource : DataSource;

    let realm : Realm;

    let idp : OAuth2IdentityProvider;

    let idpAccountService : IDPAccountService;

    const identity : IdentityProviderIdentity = {
        data: claims,
        id: 'foo',
        name: 'fooBarBaz',
    };

    beforeAll(async () => {
        setupTestConfig();

        await useTestDatabase();

        dataSource = await useDataSource();

        realm = await resolveRealm('', true);

        const repository = new IdentityProviderRepository(dataSource);
        idp = {
            authorize_url: '',
            token_url: '',
            slug: 'keycloak',
            name: 'keycloak',
            enabled: true,
            protocol: IdentityProviderProtocol.OAUTH2,
            client_id: 'client',
            client_secret: 'start123',
            realm_id: realm.id,
        } as OAuth2IdentityProvider;

        await repository.save(idp);

        idpAccountService = new IDPAccountService(dataSource, idp as IdentityProvider);
    });

    afterAll(async () => {
        await dropTestDatabase();

        dataSource = undefined;
        realm = undefined;
        idpAccountService = undefined;
    });

    it('should create user', async () => {
        const account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).toEqual('fooBarBaz');
    });

    it('should create user only once', async () => {
        let account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        const accountId = account.id;
        const userId = account.user.id;

        account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        expect(account.id).toEqual(accountId);
        expect(account.user.id).toEqual(userId);
    });

    it('should synchronize roles', async () => {
        const roleRepository = new RoleRepository(dataSource);
        const role = roleRepository.create({
            name: createNanoID(),
        });

        await roleRepository.save(role);

        const idpRoleMappingRepository = dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const idpRoleMapping = idpRoleMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            role_id: role.id,
            role_realm_id: role.realm_id,
            provider_id: idp.id,
            provider_realm_id: idp.realm_id,
        });

        await idpRoleMappingRepository.save(idpRoleMapping);

        const account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.findOne({
            where: {
                role_id: role.id,
                user_id: account.user_id,
            },
        });

        expect(userRole).toBeDefined();
    });

    it('should not synchronize roles', async () => {
        const roleRepository = new RoleRepository(dataSource);
        const role = roleRepository.create({
            name: createNanoID(),
        });

        await roleRepository.save(role);

        const idpRoleMappingRepository = dataSource.getRepository(IdentityProviderRoleMappingEntity);
        const idpRoleMapping = idpRoleMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            role_id: role.id,
            role_realm_id: role.realm_id,
            provider_id: idp.id,
            provider_realm_id: idp.realm_id,
        });

        await idpRoleMappingRepository.save(idpRoleMapping);

        const account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        const userRoleRepository = dataSource.getRepository(UserRoleEntity);
        const userRole = await userRoleRepository.findOne({
            where: {
                role_id: role.id,
                user_id: account.user_id,
            },
        });

        expect(userRole).toEqual(null);
    });

    it('should synchronize permissions', async () => {
        const permissionRepository = dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({
            name: createNanoID(),
        });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'movies:read',
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
            provider_id: idp.id,
            provider_realm_id: idp.realm_id,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permission_id: permission.id,
                user_id: account.user_id,
            },
        });

        expect(userPermission).toBeDefined();
    });

    it('should not synchronize roles', async () => {
        const permissionRepository = dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({
            name: createNanoID(),
        });

        await permissionRepository.save(permission);

        const idpPermissionMappingRepository = dataSource.getRepository(IdentityProviderPermissionMappingEntity);
        const idpPermissionMapping = idpPermissionMappingRepository.create({
            synchronization_mode: 'always',
            name: 'realm_access.roles.*',
            value: 'admin',
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
            provider_id: idp.id,
            provider_realm_id: idp.realm_id,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permission_id: permission.id,
                user_id: account.user_id,
            },
        });

        expect(userPermission).toEqual(null);
    });
});
