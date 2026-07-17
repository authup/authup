/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, RealmScope } from '@authup/access';
import { describe, expect, it } from 'vitest';
import {
    applyJunctionCreateGrant,
    buildJunctionUpdateData,
} from '../../../../../src/core/identity/permission/junction-grant.ts';

/**
 * Exhaustive coverage of the shared permission-binding cap/inherit/re-cap rule used by all four
 * junction services (role/user/client/robot-permission). The security invariant: the resulting
 * (realmScope, policyId) must always be dominated by the actor's selected grant — never widen
 * reach nor drop a policy the actor lacks.
 */
const policy = { id: 'policy-1', type: BuiltInPolicyType.IDENTITY } as any;

describe('core/identity/permission/junction-grant', () => {
    describe('applyJunctionCreateGrant', () => {
        it('caps reach to an own grant and stamps no policy (policy-free own actor)', () => {
            const validated: Record<string, any> = {};
            applyJunctionCreateGrant(validated, { realmScope: RealmScope.OWN });
            expect(validated.realmScope).toBe(RealmScope.OWN);
            expect(validated.policyId).toBeNull();
        });

        it('inherits the grant policy at the capped reach (policy-bound any actor, any request)', () => {
            const validated: Record<string, any> = { realmScope: RealmScope.ANY };
            applyJunctionCreateGrant(validated, { realmScope: RealmScope.ANY, policy });
            expect(validated.realmScope).toBe(RealmScope.ANY);
            expect(validated.policyId).toBe('policy-1');
        });

        it('caps an over-broad request down to the grant reach', () => {
            const validated: Record<string, any> = { realmScope: RealmScope.ANY };
            applyJunctionCreateGrant(validated, { realmScope: RealmScope.OWN });
            expect(validated.realmScope).toBe(RealmScope.OWN);
        });

        it('leaves an explicit policyId untouched for a genuinely unrestricted (any, policy-free) actor', () => {
            const validated: Record<string, any> = { realmScope: RealmScope.OWN, policyId: 'explicit' };
            applyJunctionCreateGrant(validated, { realmScope: RealmScope.ANY });
            // any + policy-free => the explicit policyId stands; reach capped to the request.
            expect(validated.realmScope).toBe(RealmScope.OWN);
            expect(validated.policyId).toBe('explicit');
        });
    });

    describe('buildJunctionUpdateData', () => {
        it('re-caps a wider existing reach on a policy-only update by a restricted actor (fail-closed)', () => {
            const result = buildJunctionUpdateData({
                data: { policyId: null },
                existingScope: RealmScope.ANY,
                actorScope: RealmScope.OWN,
                actorPolicyFree: true,
                actorPolicyId: null,
            });
            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policyId).toBeNull();
        });

        it('lets an unrestricted actor drop policy without narrowing reach', () => {
            const result = buildJunctionUpdateData({
                data: { policyId: null },
                existingScope: RealmScope.ANY,
                actorScope: RealmScope.ANY,
                actorPolicyFree: true,
                actorPolicyId: null,
            });
            expect(result.policyId).toBeNull();
            expect(result).not.toHaveProperty('realmScope');
        });

        it('caps a widening realmScope update to the actor reach and inherits its policy', () => {
            const result = buildJunctionUpdateData({
                data: { realmScope: RealmScope.ANY },
                existingScope: RealmScope.OWN,
                actorScope: RealmScope.OWN,
                actorPolicyFree: true,
                actorPolicyId: null,
            });
            expect(result.realmScope).toBe(RealmScope.OWN);
            expect(result.policyId).toBeNull();
        });

        it('forces a policy-bound actor to keep its own policy (cannot detach)', () => {
            const result = buildJunctionUpdateData({
                data: { policyId: null },
                existingScope: RealmScope.OWN,
                actorScope: RealmScope.OWN,
                actorPolicyFree: false,
                actorPolicyId: 'policy-1',
            });
            expect(result.policyId).toBe('policy-1');
            expect(result.realmScope).toBe(RealmScope.OWN);
        });

        it('ignores a restricted actor trying to attach an arbitrary policy', () => {
            const result = buildJunctionUpdateData({
                data: { policyId: 'attacker-policy' },
                existingScope: RealmScope.OWN,
                actorScope: RealmScope.OWN,
                actorPolicyFree: true,
                actorPolicyId: null,
            });
            expect(result.policyId).toBeNull();
            expect(result.realmScope).toBe(RealmScope.OWN);
        });

        it('lets an unrestricted actor set an explicit policyId without narrowing reach', () => {
            const result = buildJunctionUpdateData({
                data: { policyId: 'explicit' },
                existingScope: RealmScope.OWN,
                actorScope: RealmScope.ANY,
                actorPolicyFree: true,
                actorPolicyId: null,
            });
            expect(result.policyId).toBe('explicit');
            expect(result).not.toHaveProperty('realmScope');
        });

        it('is a no-op when the update touches neither field', () => {
            const result = buildJunctionUpdateData({
                data: {},
                existingScope: RealmScope.ANY,
                actorScope: RealmScope.OWN,
                actorPolicyFree: true,
                actorPolicyId: null,
            });
            expect(result).toEqual({});
        });
    });
});
