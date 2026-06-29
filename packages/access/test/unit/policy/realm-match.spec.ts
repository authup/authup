/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { RealmMatchPolicy } from '../../../src';
import {
    BuiltInPolicyType,
    PolicyData,
    RealmMatchPolicyEvaluator,
    definePolicyEvaluationContext,
} from '../../../src';

describe('src/policy/attribute-realm', () => {
    it('should permit by matching realm', async () => {
        const config : RealmMatchPolicy = {};

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(config, definePolicyEvaluationContext({
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
                [BuiltInPolicyType.ATTRIBUTES]: { realm_id: 'c641912c-21e5-4cb4-84b6-169e2b2bb023' },
            }),
        }));
        expect(outcome.success).toBeTruthy();
    });

    it('should permit by lazy attribute name matching', async () => {
        const config : RealmMatchPolicy = { attribute_name_strict: true };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(config, definePolicyEvaluationContext({
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                    realmName: 'master',
                },
                [BuiltInPolicyType.ATTRIBUTES]: {
                    user_realm_id: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                    permission_realm_id: null,
                },
            }),
        }));
        expect(outcome.success).toBeTruthy();
    });

    it('should restrict due non matching realm', async () => {
        const config : RealmMatchPolicy = { };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(config, definePolicyEvaluationContext({
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
                },
                [BuiltInPolicyType.ATTRIBUTES]: { realm_id: '1b17ab3d-3e87-4d63-9997-374ed9a58c23' },
            }),
        }));
        expect(outcome.success).toBeFalsy();
    });

    it('should restrict a master-realm actor on a non-matching realm (no master privilege)', async () => {
        const policy : RealmMatchPolicy = { };

        const evaluator = new RealmMatchPolicyEvaluator();

        const outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: {
                    type: 'user',
                    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
                    realmName: 'master',
                },
                [BuiltInPolicyType.ATTRIBUTES]: { realm_id: '1b17ab3d-3e87-4d63-9997-374ed9a58c23' },
            }),
        }));
        expect(outcome.success).toBeFalsy();
    });
});

describe('src/policy/realm-match scope mode', () => {
    const REALM_A = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';
    const REALM_B = '1b17ab3d-3e87-4d63-9997-374ed9a58c23';
    const evaluator = new RealmMatchPolicyEvaluator();
    const identityA = {
        type: 'user',
        id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
        realmId: REALM_A,
    };

    const run = (policy: RealmMatchPolicy, data: Record<string, any>) => evaluator.evaluate(
        policy,
        definePolicyEvaluationContext({ data: new PolicyData(data) }),
    );

    it('own: matches the actor own realm (REALM_MATCH key)', async () => {
        const o = await run({ scope: 'own' }, {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.REALM_MATCH]: REALM_A,
        });
        expect(o.success).toBe(true);
    });

    it('own: denies a foreign realm', async () => {
        const o = await run({ scope: 'own' }, {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.REALM_MATCH]: REALM_B,
        });
        expect(o.success).toBe(false);
    });

    it('own: denies a null (global) resource', async () => {
        const o = await run({ scope: 'own' }, {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.REALM_MATCH]: null,
        });
        expect(o.success).toBe(false);
    });

    it('ownOrNull: permits a null (global) resource', async () => {
        const o = await run({ scope: 'ownOrNull' }, {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.REALM_MATCH]: null,
        });
        expect(o.success).toBe(true);
    });

    it('any: permits any realm including null', async () => {
        const foreign = await run({ scope: 'any' }, {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.REALM_MATCH]: REALM_B,
        });
        const global = await run({ scope: 'any' }, {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.REALM_MATCH]: null,
        });
        expect(foreign.success).toBe(true);
        expect(global.success).toBe(true);
    });

    it('absent resource realm (no REALM_MATCH, no ATTRIBUTES) neutral-passes the gate', async () => {
        const o = await run({ scope: 'own' }, { [BuiltInPolicyType.IDENTITY]: identityA });
        expect(o.success).toBe(true);
    });

    it('reads ONLY the REALM_MATCH key — an ATTRIBUTES.realm_id is not a realm source', async () => {
        // Single-source: with no REALM_MATCH key the gate neutral-passes, even when
        // ATTRIBUTES carries a (foreign) realm_id.
        const o = await run({ scope: 'own' }, {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.ATTRIBUTES]: { realm_id: REALM_B },
        });
        expect(o.success).toBe(true);
    });
});
