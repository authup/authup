/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import type { DataSource } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import type { UserEntity } from '../../../../src';
import {
    PermissionChecker, PermissionEntity, PolicyRepository, UserRepository,
} from '../../../../src';
import { SpecialPolicyType } from '../../../../src/security/policy/constants';
import { setupTestConfig } from '../../../utils/config';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/security/permission/checker', () => {
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

    it('should verify with valid identity & permission', async () => {
        const checker = new PermissionChecker();
        const hasPermission = await checker.safeCheck(PermissionName.USER_CREATE, {
            identity: {
                type: 'user',
                id: adminUser.id,
            },
        });
        expect(hasPermission).toBeTruthy();
    });

    it('should verify with permission-binding policy', async () => {
        const policyRepository = new PolicyRepository(dataSource);
        const policy = policyRepository.create({
            type: SpecialPolicyType.PERMISSION_BINDING,
            name: SpecialPolicyType.PERMISSION_BINDING,
            built_in: true,
        });

        await policyRepository.save(policy);

        const permissionRepository = dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.findOneBy({
            name: PermissionName.USER_DELETE,
            built_in: true,
        });

        permission.policy = policy;

        await permissionRepository.save(permission);

        const checker = new PermissionChecker();
        const hasPermission = await checker.safeCheck(PermissionName.USER_DELETE, {
            identity: {
                type: 'user',
                id: adminUser.id,
            },
        });
        expect(hasPermission).toBeTruthy();
    });

    it('should not verify with permission-binding and non existing relation', async () => {
        const policyRepository = new PolicyRepository(dataSource);
        const policy = policyRepository.create({
            type: SpecialPolicyType.PERMISSION_BINDING,
            name: SpecialPolicyType.PERMISSION_BINDING,
            built_in: true,
        });

        await policyRepository.save(policy);

        const name = createNanoID();

        const permissionRepository = dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({ name });

        permission.policy = policy;

        await permissionRepository.save(permission);

        const checker = new PermissionChecker();
        const hasPermission = await checker.safeCheck(name, {
            identity: {
                type: 'user',
                id: adminUser.id,
            },
        });
        expect(hasPermission).toBeFalsy();
    });

    it('should not verify with invalid permission', async () => {
        const checker = new PermissionChecker();
        const hasPermission = await checker.safeCheck('foo', {
            identity: {
                type: 'user',
                id: adminUser.id,
            },
        });
        expect(hasPermission).toBeFalsy();
    });
});
