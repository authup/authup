/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData, PermissionPolicyBinding } from '@authup/access';
import {
    BuiltInPolicyType,
    PolicyData,
    PolicyDefaultEvaluators,
    RealmScope,
    definePolicyEvaluationContext,
} from '@authup/access';
import { describe, expect, it } from 'vitest';
import { PermissionBindingPolicyEvaluator } from '../../../../src/core/security/policy/evaluator.ts';
import { FakeIdentityPermissionProvider } from '../helpers/index.ts';

/**
 * Disjunction semantics of the permission-binding evaluator (issue #3155).
 *
 * An actor can hold several grants for the SAME permission with different
 * (realm_scope, policy). Access is the DISJUNCTION over grants:
 *   ∃ grant . realmScopeMatches(grant.realm_scope, resource) ∧ (grant.policies pass)
 * keeping each grant's realm reach paired with its OWN policy. This guards against:
 *  - UNDER-grant: a policy-free `own` grant must not mask a policy-bound `any` grant's
 *    legitimately wider reach.
 *  - OVER-grant: an `own`-scoped grant's passing policy must not ride an `any`-scoped
 *    grant's wider reach when the `any` grant's own policy fails.
 */
describe('core/security/policy — PermissionBindingPolicyEvaluator disjunction (#3155)', () => {
    const REALM_A = '11111111-1111-4111-8111-111111111111';
    const REALM_B = '22222222-2222-4222-8222-222222222222';

    const identityA: IdentityPolicyData = {
        type: 'user',
        id: '33333333-3333-4333-8333-333333333333',
        realmId: REALM_A,
    };

    const PERMISSION_NAME = 'user_read';

    // A policy that PASSES for identityA (an `identity` policy with no type restriction
    // permits every identity) and one that FAILS (restricts to `client`, identityA is a user).
    const passingPolicy = { type: BuiltInPolicyType.IDENTITY };
    const failingPolicy = { type: BuiltInPolicyType.IDENTITY, types: ['client'] };

    type RunOptions = {
        bindings: PermissionPolicyBinding[],
        resourceRealm?: string | null,
        withResourceRealm?: boolean,
    };

    const run = ({
        bindings, 
        resourceRealm, 
        withResourceRealm = true, 
    }: RunOptions) => {
        const provider = new FakeIdentityPermissionProvider();
        provider.setBindings(bindings);

        const data: Record<string, any> = {
            [BuiltInPolicyType.IDENTITY]: identityA,
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission: { name: PERMISSION_NAME } },
        };
        if (withResourceRealm) {
            data[BuiltInPolicyType.REALM_MATCH] = resourceRealm ?? null;
        }

        const evaluator = new PermissionBindingPolicyEvaluator(provider);
        return evaluator.evaluate(
            { type: BuiltInPolicyType.PERMISSION_BINDING },
            definePolicyEvaluationContext({
                data: new PolicyData(data),
                evaluators: PolicyDefaultEvaluators,
            }),
        );
    };

    const grant = (
        realmScope: `${RealmScope}`,
        policies?: PermissionPolicyBinding['policies'],
    ): PermissionPolicyBinding => ({
        permission: { name: PERMISSION_NAME },
        realmScope,
        policies,
    });

    describe('under-grant: policy-free own + policy-bound any', () => {
        const bindings = [
            grant(RealmScope.OWN), // policy-free, own reach
            grant(RealmScope.ANY, [passingPolicy]), // wider reach, gated by a passing policy
        ];

        it('grants cross-realm access via the any+policy grant (the fix)', async () => {
            const outcome = await run({ bindings, resourceRealm: REALM_B });
            expect(outcome.success).toBe(true);
        });

        it('still grants own-realm access via the policy-free own grant', async () => {
            const outcome = await run({ bindings, resourceRealm: REALM_A });
            expect(outcome.success).toBe(true);
        });
    });

    describe('over-grant: policy-bound own (passing) + policy-bound any (failing)', () => {
        const bindings = [
            grant(RealmScope.OWN, [passingPolicy]), // own reach, policy passes
            grant(RealmScope.ANY, [failingPolicy]), // wider reach, policy FAILS
        ];

        it('denies cross-realm access — the own grant policy must not ride the any reach', async () => {
            const outcome = await run({ bindings, resourceRealm: REALM_B });
            expect(outcome.success).toBe(false);
        });

        it('grants own-realm access via the own grant (its policy passes)', async () => {
            const outcome = await run({ bindings, resourceRealm: REALM_A });
            expect(outcome.success).toBe(true);
        });
    });

    describe('single grant (disjunction over one term == today)', () => {
        const bindings = [grant(RealmScope.OWN)];

        it('grants own realm', async () => {
            expect((await run({ bindings, resourceRealm: REALM_A })).success).toBe(true);
        });

        it('denies a foreign realm', async () => {
            expect((await run({ bindings, resourceRealm: REALM_B })).success).toBe(false);
        });
    });

    describe('null (global) resource realm', () => {
        it('own does not reach a null resource', async () => {
            const outcome = await run({ bindings: [grant(RealmScope.OWN)], resourceRealm: null });
            expect(outcome.success).toBe(false);
        });

        it('ownOrNull reaches a null resource', async () => {
            const outcome = await run({ bindings: [grant(RealmScope.OWN_OR_NULL)], resourceRealm: null });
            expect(outcome.success).toBe(true);
        });
    });

    describe('policy gating per reachable grant', () => {
        it('denies when the only reachable grant has a failing policy', async () => {
            const outcome = await run({
                bindings: [grant(RealmScope.OWN, [failingPolicy])],
                resourceRealm: REALM_A,
            });
            expect(outcome.success).toBe(false);
        });
    });

    describe('neutral pass (no resource realm — gate / preEvaluate shape)', () => {
        it('an own grant with a passing policy neutral-passes the realm factor and grants', async () => {
            const outcome = await run({
                bindings: [grant(RealmScope.OWN, [passingPolicy])],
                withResourceRealm: false,
            });
            expect(outcome.success).toBe(true);
        });
    });

    describe('no grants at all', () => {
        it('denies when the actor holds no matching grant', async () => {
            const outcome = await run({ bindings: [], resourceRealm: REALM_A });
            expect(outcome.success).toBe(false);
        });
    });
});
