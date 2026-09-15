/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compileFilters } from '@rapiq/adapter-memory';
import type { IFilter, IFilters } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import type { PermissionPolicyBinding } from '../../../src';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyDefaultEvaluators,
    PolicyEngine,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';

const identity = {
    type: 'user',
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
};
const permission = { name: 'user_read' };

describe('identity permission binding compilation', () => {
    it.each([false, true])('matches concrete evaluation for nested grants (invert: %s)', async (invert) => {
        const bindings: PermissionPolicyBinding[] = [
            { permission, realmScope: 'own' },
            {
                permission,
                realmScope: 'any',
                policies: [definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    children: [
                        definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
                        definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: 'public' } }),
                    ],
                })],
            },
        ];
        const engine = new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator({ getFor: async () => bindings }),
        });
        const policy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, { invert });
        const data = () => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        });
        const compiled = await engine.evaluate(policy, definePolicyEvaluationContext({
            data: data(),
            withConditions: true,
        }));
        expect(compiled.pending).toBe(true);
        expect(compiled.condition).toBeDefined();
        const predicate = compileFilters(compiled.condition! as IFilter | IFilters, { caseSensitive: true });

        const rows = [
            {
                realmId: identity.realmId,
                name: 'private',
                allowed: true,
            },
            {
                realmId: '11111111-2222-4333-8444-555555555555',
                name: 'public',
                allowed: true,
            },
            {
                realmId: '11111111-2222-4333-8444-555555555555',
                name: 'private',
                allowed: false,
            },
            {
                realmId: null,
                name: 'public',
                allowed: true,
            },
            {
                realmId: null,
                name: 'private',
                allowed: false,
            },
        ];
        for (const row of rows) {
            const concreteData = data();
            concreteData.set(BuiltInPolicyType.REALM_MATCH, row.realmId);
            concreteData.set(BuiltInPolicyType.ATTRIBUTES, row);
            const settled = await engine.evaluate(policy, definePolicyEvaluationContext({ data: concreteData }));
            const expected = invert ? !row.allowed : row.allowed;
            expect(settled.success, JSON.stringify(row)).toBe(expected);
            expect(predicate(row), JSON.stringify(row)).toBe(expected);
        }
    });

    it('denies null-realm rows to a realm-less actor with ownOrNull reach', async () => {
        const engine = new PolicyEngine(PolicyDefaultEvaluators);
        const policy = definePolicyWithType(BuiltInPolicyType.REALM_MATCH, { scope: 'ownOrNull' });
        const data = definePolicyData({ [BuiltInPolicyType.IDENTITY]: { ...identity, realmId: null } });
        const compiled = await engine.evaluate(policy, definePolicyEvaluationContext({ data, withConditions: true }));
        expect(compiled.condition).toBeDefined();
        const predicate = compileFilters(compiled.condition! as IFilter | IFilters, { caseSensitive: true });

        data.set(BuiltInPolicyType.REALM_MATCH, null);
        const settled = await engine.evaluate(policy, definePolicyEvaluationContext({ data }));
        expect(settled.success).toBe(false);
        expect(predicate({ realmId: null })).toBe(false);
    });

    it('lowers the reach onto the column realmAttributeName names', async () => {
        // a junction row carries no `realmId` at all — it carries the realm of the
        // entities it links (`roleRealmId`, `clientRealmId`, …), so the reach has to
        // bind that column or the emitted WHERE names a column the table does not
        // have (issue #3594)
        const bindings: PermissionPolicyBinding[] = [{ permission, realmScope: 'ownOrNull' }];
        const engine = new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator({ getFor: async () => bindings }),
        });
        const policy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {});
        const data = definePolicyData({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        });

        const compiled = await engine.evaluate(policy, definePolicyEvaluationContext({
            data,
            withConditions: true,
            realmAttributeName: 'roleRealmId',
        }));
        expect(compiled.condition).toBeDefined();

        const foreignRealmId = '11111111-2222-4333-8444-555555555555';
        const predicate = compileFilters(compiled.condition! as IFilter | IFilters, { caseSensitive: true });
        expect(predicate({ roleRealmId: identity.realmId })).toBeTruthy();
        expect(predicate({ roleRealmId: null })).toBeTruthy();
        expect(predicate({ roleRealmId: foreignRealmId })).toBeFalsy();
        // it binds the NAMED column, not `realmId` riding alongside it
        expect(predicate({ roleRealmId: foreignRealmId, realmId: identity.realmId })).toBeFalsy();

        // and the default is unchanged when no column is named
        const fallback = await engine.evaluate(policy, definePolicyEvaluationContext({
            data,
            withConditions: true,
        }));
        const fallbackPredicate = compileFilters(fallback.condition! as IFilter | IFilters, { caseSensitive: true });
        expect(fallbackPredicate({ realmId: identity.realmId })).toBeTruthy();
        expect(fallbackPredicate({ realmId: foreignRealmId })).toBeFalsy();
        // NOTE deliberately not asserted against a row CARRYING no `realmId` key:
        // the memory adapter unifies a missing column with `null`, which an
        // `ownOrNull` reach matches — the documented fail-open that the adapters'
        // force-select of the gate column exists to prevent.
    });
});
