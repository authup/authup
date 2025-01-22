/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicy } from '../../../src';
import {
    IdentityPolicyEvaluator,
} from '../../../src';
import { buildTestPolicyEvaluateContext } from '../../utils';

describe('src/policy/identity', () => {
    it('should permit due defined identity', async () => {
        const spec : IdentityPolicy = {
            types: [],
        };

        const evaluator = new IdentityPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
            },
        }));
        expect(outcome).toBeTruthy();
    });

    it('should permit due matching type', async () => {
        const spec : IdentityPolicy = {
            types: ['user'],
        };

        const evaluator = new IdentityPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmName: 'master',
                },
            },
        }));
        expect(outcome).toBeTruthy();
    });

    it('should not permit due non matching type', async () => {
        const spec : IdentityPolicy = {
            types: ['foo'],
        };

        const evaluator = new IdentityPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
            },
        }));
        expect(outcome).toBeFalsy();
    });

    it('should not permit due non defined identity', async () => {
        const spec : IdentityPolicy = {
            types: [],
        };

        const evaluator = new IdentityPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {},
        }));
        expect(outcome).toBeFalsy();
    });
});
