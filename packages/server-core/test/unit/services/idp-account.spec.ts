/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, OAuth2IdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { undefined } from 'zod';
import claims from '../../data/jwt.json';
import type { IdentityProviderIdentity } from '../../../src';
import {
    IdentityProviderAccountService,
    IdentityProviderPermissionMappingEntity,
    IdentityProviderRepository,
    IdentityProviderRoleMappingEntity,
    PermissionEntity,
    RoleRepository,
    UserPermissionEntity,
    UserRoleEntity,
    resolveRealm,
} from '../../../src';
import { createTestSuite } from '../../utils';

describe('idp-manager-service', () => {
    const suite = createTestSuite();

    let realm : Realm;

    let idp : OAuth2IdentityProvider;

    let idpAccountService : IdentityProviderAccountService;

    const identity : IdentityProviderIdentity = {
        id: 'foo',
        data: claims,
        attributeCandidates: {
            name: ['fooBarBaz'],
        },
    };

    beforeAll(async () => {
        await suite.up();

        realm = await resolveRealm('', true);

        const repository = new IdentityProviderRepository(suite.dataSource);
        idp = {
            authorize_url: '',
            token_url: '',
            name: 'keycloak',
            enabled: true,
            protocol: IdentityProviderProtocol.OAUTH2,
            client_id: 'client',
            client_secret: 'start123',
            realm_id: realm.id,
        } as OAuth2IdentityProvider;

        await repository.save(idp);

        idpAccountService = new IdentityProviderAccountService(suite.dataSource, idp as IdentityProvider);
    });

    afterAll(async () => {
        await suite.down();

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

    it('should create user with alternative name', async () => {
        const account = await idpAccountService.save({
            data: claims,
            id: 'bar',
            attributeCandidates: {
                name: [
                    'admin', // exists
                    '', // invalid due validation rules
                    'bar', // valid
                ],
            },
        });

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).toEqual('bar');
    });

    it('should create user with random name', async () => {
        const account = await idpAccountService.save({
            data: claims,
            id: 'baz',
            attributeCandidates: {
                name: [
                    'admin', // exists
                ],
            },
        });

        expect(account.id).toBeDefined();
        expect(account.user.id).toBeDefined();
        expect(account.user.name).not.toEqual('admin');
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
            provider_id: idp.id,
            provider_realm_id: idp.realm_id,
        });

        await idpRoleMappingRepository.save(idpRoleMapping);

        const account = await idpAccountService.save(identity);
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

        const idpRoleMappingRepository = suite.dataSource.getRepository(IdentityProviderRoleMappingEntity);
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
            provider_id: idp.id,
            provider_realm_id: idp.realm_id,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await idpAccountService.save(identity);
        expect(account).toBeDefined();

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = await userPermissionRepository.findOne({
            where: {
                permission_id: permission.id,
                user_id: account.user_id,
            },
        });

        expect(userPermission).toBeDefined();
    });

    it('should not synchronize roles', async () => {
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
            provider_id: idp.id,
            provider_realm_id: idp.realm_id,
        });

        await idpPermissionMappingRepository.save(idpPermissionMapping);

        const account = await idpAccountService.save(identity);
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
