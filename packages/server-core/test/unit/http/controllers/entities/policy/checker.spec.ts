/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/security';
import { PolicyRepository } from '../../../../../../src';
import { createTestSuite } from '../../../../../utils';

describe('src/security/permission/checker', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
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
