/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType, createNanoID,
} from '@authup/kit';
import type { DataSource } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import type { UserEntity } from '../../../../../src';
import {
    PermissionEntity,
    PolicyRepository, UserPermissionEntity, UserRepository,
} from '../../../../../src';
import { setupTestConfig } from '../../../../utils/config';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import { useSuperTest } from '../../../../utils/supertest';

describe('src/security/permission/checker', () => {
    const superTest = useSuperTest();

    let adminUser : UserEntity;

    let dataSource : DataSource;

    beforeAll(async () => {
        setupTestConfig();

        await useTestDatabase();

        dataSource = await useDataSource();
        const repository = new UserRepository(dataSource);

        adminUser = await repository.findOneBy({
            name: 'admin',
        });
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    /*
    it('should verify with valid permission', async () => {
        expect.assertions(1);

        const repository = dataSource.getRepository(PermissionEntity);
        const name = createNanoID();
        const entity = repository.create({
            name,
            built_in: true,
        });

        await repository.save(entity);

        try {
            await checker.check({
                name,
                data: {
                    identity: {
                        type: 'user',
                        id: adminUser.id,
                    },
                },
            });
            expect(true).toBeTruthy();
        } catch (e) {
            expect(true).toBeFalsy();
        }
    });
     */

    it('should not verify invalid permission', async () => {
        expect.assertions(1);

        const name = createNanoID();
        const response = await superTest
            .post(`/permissions/${name}/check`)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(404);
    });

    it('should verify with permission-binding and existing relation', async () => {
        const policyRepository = new PolicyRepository(dataSource);
        const policy = policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            built_in: true,
        });

        await policyRepository.save(policy);

        const permissionRepository = dataSource.getRepository(PermissionEntity);
        const name = createNanoID();
        const permission = permissionRepository.create({
            name,
            built_in: true,
        });

        permission.policy = policy;

        await permissionRepository.save(permission);

        const userPermissionRepository = dataSource.getRepository(UserPermissionEntity);
        const userPermission = userPermissionRepository.create({
            user_id: adminUser.id,
            user_realm_id: adminUser.realm_id,
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
        });

        await userPermissionRepository.save(userPermission);

        const response = await superTest
            .post(`/permissions/${name}/check`)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(202);
        expect(response.body).toBeDefined();
        expect(response.body.status).toEqual('success');
    });

    it('should not verify with permission-binding and non existing relation', async () => {
        const policyRepository = new PolicyRepository(dataSource);
        const policy = policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            built_in: true,
        });

        await policyRepository.save(policy);

        const name = createNanoID();

        const permissionRepository = dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({ name });

        permission.policy = policy;

        await permissionRepository.save(permission);

        const response = await superTest
            .post(`/permissions/${name}/check`)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(202);
        expect(response.body).toBeDefined();
        expect(response.body.status).toEqual('error');
    });
});
