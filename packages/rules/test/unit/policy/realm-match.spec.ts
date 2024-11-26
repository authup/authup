/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RealmMatchPolicy } from '../../../src';
import {
    RealmMatchPolicyEvaluator,
} from '../../../src';
import { buildTestPolicyEvaluateContext } from '../../utils';

describe('src/policy/attribute-realm', () => {
    it('should permit by matching realm', async () => {
        const spec : RealmMatchPolicy = {};

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
                attributes: {
                    realm_id: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
            },
        }));
        expect(outcome).toBeTruthy();
    });

    it('should permit by lazy attribute name matching', async () => {
        const spec : RealmMatchPolicy = {
            attributeNameStrict: true,
            identityMasterMatchAll: true,
        };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                    realmName: 'master',
                },
                attributes: {
                    user_realm_id: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                    permission_realm_id: null,
                },
            },
        }));
        expect(outcome).toBeTruthy();
    });

    it('should permit by matching master realm', async () => {
        const spec : RealmMatchPolicy = {
            identityMasterMatchAll: true,
        };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmName: 'master',
                },
                attributes: {
                    realm_id: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
            },
        }));
        expect(outcome).toBeTruthy();
    });

    it('should restrict due non matching realm', async () => {
        const spec : RealmMatchPolicy = { };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
                attributes: {
                    realm_id: '1b17ab3d-3e87-4d63-9997-374ed9a58c23',
                },
            },
        }));
        expect(outcome).toBeFalsy();
    });

    it('should restrict due non matching realm and master full scope disabled', async () => {
        const spec : RealmMatchPolicy = {
            identityMasterMatchAll: false,
        };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                identity: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmName: 'master',
                },
                attributes: {
                    realm_id: '1b17ab3d-3e87-4d63-9997-374ed9a58c23',
                },
            },
        }));
        expect(outcome).toBeFalsy();
    });
});
