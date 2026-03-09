/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { BuiltInPolicyType } from '@authup/access';
import { PolicyRepository } from '../../../../../../src';
import { createTestApplication } from '../../../../../app';

describe('src/security/permission/checker', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should verify valid policy', async () => {
        const policyRepository = new PolicyRepository(suite.dataSource);
        const policy = policyRepository.create({
            type: BuiltInPolicyType.IDENTITY,
            name: BuiltInPolicyType.IDENTITY,
            built_in: true,
        });

        await policyRepository.save(policy);

        const response = await suite.client
            .policy
            .check(policy.id);

        expect(response.status).toEqual('success');
    });
});
