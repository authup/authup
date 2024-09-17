/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/kit';
import type { DataSource } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { PolicyRepository } from '../../../../../src';
import { setupTestConfig } from '../../../../utils/config';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import { useSuperTest } from '../../../../utils/supertest';

describe('src/security/permission/checker', () => {
    const superTest = useSuperTest();

    let dataSource: DataSource;

    beforeAll(async () => {
        setupTestConfig();

        await useTestDatabase();

        dataSource = await useDataSource();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should verify valid policy', async () => {
        const policyRepository = new PolicyRepository(dataSource);
        const policy = policyRepository.create({
            type: BuiltInPolicyType.IDENTITY,
            name: BuiltInPolicyType.IDENTITY,
            built_in: true,
        });

        await policyRepository.save(policy);

        const response = await superTest
            .post(`/policies/${policy.id}/check`)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(202);
    });
});
