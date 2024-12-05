/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/security';
import {
    createNanoID,
} from '@authup/kit';
import { isClientError } from 'hapic';
import type { UserEntity } from '../../../../../../src';
import {
    PermissionEntity,
    PolicyRepository, UserPermissionEntity, UserRepository,
} from '../../../../../../src';
import { createTestSuite } from '../../../../../utils';

describe('src/security/permission/checker', () => {
    const suite = createTestSuite();

    let adminUser : UserEntity;

    beforeAll(async () => {
        await suite.up();

        const repository = new UserRepository(suite.dataSource);

        adminUser = await repository.findOneBy({
            name: 'admin',
        });
    });

    afterAll(async () => {
        await suite.down();
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

        try {
            const name = createNanoID();
            await suite.client
                .permission
                .check(name);
        } catch (e) {
            if (isClientError(e)) {
                expect(e.statusCode).toEqual(404);
            }
        }
    });

    it('should verify with permission-binding and existing relation', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            built_in: true,
        });

        await policyRepository.save(policy);

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const name = createNanoID();
        const permission = permissionRepository.create({
            name,
            built_in: true,
        });

        permission.policy = policy;

        await permissionRepository.save(permission);

        const userPermissionRepository = suite.dataSource.getRepository(UserPermissionEntity);
        const userPermission = userPermissionRepository.create({
            user_id: adminUser.id,
            user_realm_id: adminUser.realm_id,
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
        });

        await userPermissionRepository.save(userPermission);

        const response = await suite.client
            .permission
            .check(permission.id);

        expect(response).toBeDefined();
        expect(response.status).toEqual('success');
    });

    it('should not verify with permission-binding and non existing relation', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = policyRepository.create({
            type: BuiltInPolicyType.PERMISSION_BINDING,
            name: BuiltInPolicyType.PERMISSION_BINDING,
            built_in: true,
        });

        await policyRepository.save(policy);

        const name = createNanoID();

        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = permissionRepository.create({ name });

        permission.policy = policy;

        await permissionRepository.save(permission);

        const response = await suite.client
            .permission
            .check(name);

        expect(response).toBeDefined();
        expect(response.status).toEqual('error');
    });
});
