/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import type {
    PermissionPolicyBinding,
    PolicyEvaluationResult,
    PolicyInput,
    PolicyWithType,
} from '../../../src';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyDefaultEvaluators,
    PolicyEngine,
    RealmMatchPolicyValidator,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';

type Verdict = 'pass' | 'deny' | 'pending';

type ImmutabilityCase = {
    name: string,
    policy: () => PolicyWithType,
    data: () => PolicyInput,
    settled: Verdict,
    missing?: Verdict,
    condition?: boolean,
};

const realmId = 'c641912c-21e5-4cb4-84b6-169e2b2bb023';

const identity = {
    type: 'user',
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    realmId,
    realmName: 'master',
};

const permission = { name: 'user_read' };

function deepFreeze<T>(value: T) : T {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);

        for (const value_ of Object.values(value as Record<string, unknown>)) {
            deepFreeze(value_);
        }
    }

    return value;
}

function createWriteRefusingProxy<T extends object>(value: T) : T {
    return new Proxy(value, {
        get(target, key, receiver) {
            const child : unknown = Reflect.get(target, key, receiver);

            if (child !== null && typeof child === 'object') {
                return createWriteRefusingProxy(child);
            }

            return child;
        },
        set() {
            throw new TypeError('The policy must not be written to.');
        },
        defineProperty() {
            throw new TypeError('The policy must not be written to.');
        },
        deleteProperty() {
            throw new TypeError('The policy must not be written to.');
        },
    });
}

function toVerdict(result: PolicyEvaluationResult) : Verdict | 'unevaluable' {
    if (result.unevaluable) {
        return 'unevaluable';
    }

    if (result.pending) {
        return 'pending';
    }

    return result.success ? 'pass' : 'deny';
}

function createAttributesPolicy() {
    return definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, {
        query: {
            $and: [
                { name: { $regex: '/^adm/i' } },
                { $or: [{ tags: { $in: ['a', 'b'] } }, { name: { $regex: '/^root$/' } }] },
            ],
        },
    });
}

function createAttributesData() : PolicyInput {
    return { [BuiltInPolicyType.ATTRIBUTES]: { name: 'Admin', tags: 'a' } };
}

const cases : ImmutabilityCase[] = [
    {
        name: 'attributes with a nested $regex',
        policy: createAttributesPolicy,
        data: createAttributesData,
        settled: 'pass',
        missing: 'pending',
        condition: true,
    },
    {
        name: 'attributes with a RegExp and a Date operand',
        policy: () => definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, {
            query: {
                name: { $regex: /^adm/i },
                createdAt: { $lt: new Date('2030-01-01T00:00:00Z') },
            },
        }),
        data: () => ({ [BuiltInPolicyType.ATTRIBUTES]: { name: 'Admin', createdAt: new Date('2026-01-01T00:00:00Z') } }),
        settled: 'pass',
        missing: 'pending',
        condition: true,
    },
    {
        name: 'attributeNames',
        policy: () => definePolicyWithType(BuiltInPolicyType.ATTRIBUTE_NAMES, { names: ['name', 'tags'] }),
        data: () => ({ [BuiltInPolicyType.ATTRIBUTE_NAMES]: ['name'] }),
        settled: 'pass',
        missing: 'pending',
    },
    {
        name: 'date',
        policy: () => definePolicyWithType(BuiltInPolicyType.DATE, { start: '2000-01-01', end: '2999-12-31' }),
        data: () => ({ [BuiltInPolicyType.DATE]: '2026-06-01' }),
        settled: 'pass',
        missing: 'pass',
    },
    {
        name: 'time',
        policy: () => definePolicyWithType(BuiltInPolicyType.TIME, { start: '08:00', end: '18:00' }),
        data: () => ({ [BuiltInPolicyType.TIME]: '2026-06-01T12:00:00' }),
        settled: 'pass',
    },
    {
        name: 'identity',
        policy: () => definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
        data: () => ({ [BuiltInPolicyType.IDENTITY]: identity }),
        settled: 'pass',
        missing: 'pending',
    },
    {
        name: 'realmMatch in scope mode',
        policy: () => definePolicyWithType(BuiltInPolicyType.REALM_MATCH, { scope: 'own' }),
        data: () => ({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.REALM_MATCH]: realmId,
        }),
        settled: 'pass',
        missing: 'pending',
    },
    {
        name: 'realmMatch in attribute mode without attributeName',
        policy: () => definePolicyWithType(BuiltInPolicyType.REALM_MATCH, { decisionStrategy: DecisionStrategy.UNANIMOUS }),
        data: () => ({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.ATTRIBUTES]: {
                realmId,
                realmName: 'other',
                realm_id: realmId,
            },
        }),
        // CONSENSUS over the default keys: two matches, one miss
        settled: 'pass',
        missing: 'pending',
    },
    {
        name: 'realmMatch in attribute mode with a non-strict attributeName list',
        policy: () => definePolicyWithType(BuiltInPolicyType.REALM_MATCH, {
            attributeName: ['realmId'],
            attributeNameStrict: false,
        }),
        data: () => ({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.ATTRIBUTES]: { realmId, userRealmId: realmId },
        }),
        settled: 'pass',
        missing: 'pending',
    },
    {
        name: 'permissionBinding',
        policy: () => definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {}),
        data: () => ({ [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] } }),
        settled: 'pass',
        missing: 'pending',
    },
    {
        name: 'composite of every built-in type',
        policy: () => definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            decisionStrategy: DecisionStrategy.UNANIMOUS,
            children: [
                createAttributesPolicy(),
                definePolicyWithType(BuiltInPolicyType.ATTRIBUTE_NAMES, { names: ['name', 'tags', 'realmId'] }),
                definePolicyWithType(BuiltInPolicyType.DATE, { start: '2000-01-01', end: '2999-12-31' }),
                definePolicyWithType(BuiltInPolicyType.TIME, { start: '08:00', end: '18:00' }),
                definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
                definePolicyWithType(BuiltInPolicyType.REALM_MATCH, { scope: 'own' }),
                definePolicyWithType(BuiltInPolicyType.REALM_MATCH, {}),
                definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {}),
            ],
        }),
        data: () => ({
            [BuiltInPolicyType.ATTRIBUTES]: {
                name: 'Admin',
                tags: 'a',
                realmId,
            },
            [BuiltInPolicyType.ATTRIBUTE_NAMES]: ['name'],
            [BuiltInPolicyType.DATE]: '2026-06-01',
            [BuiltInPolicyType.TIME]: '2026-06-01T12:00:00',
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.REALM_MATCH]: realmId,
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        }),
        settled: 'pass',
        missing: 'pending',
    },
];

async function evaluateThreeWays(
    engine: PolicyEngine,
    policy: PolicyWithType,
    data: () => PolicyInput,
) {
    const settled = await engine.evaluate(policy, definePolicyEvaluationContext({ data: definePolicyData(data()) }));
    const missing = await engine.evaluate(policy, definePolicyEvaluationContext({ data: definePolicyData({}) }));
    const conditions = await engine.evaluate(policy, definePolicyEvaluationContext({
        data: definePolicyData({}),
        withConditions: true,
    }));

    return {
        settled,
        missing,
        conditions,
    };
}

describe('src/policy/built-in (immutability)', () => {
    it.each(cases)('$name does not write into a frozen policy', async (item) => {
        const policy = item.policy();
        const expectation = structuredClone(policy);

        deepFreeze(policy);

        const engine = new PolicyEngine(PolicyDefaultEvaluators);
        const {
            settled,
            missing,
            conditions,
        } = await evaluateThreeWays(engine, policy, item.data);

        expect(toVerdict(settled), JSON.stringify(settled.issues)).toEqual(item.settled);

        if (item.missing) {
            expect(toVerdict(missing), JSON.stringify(missing.issues)).toEqual(item.missing);
        } else {
            expect(missing.unevaluable, JSON.stringify(missing.issues)).toBeFalsy();
        }

        expect(conditions.unevaluable, JSON.stringify(conditions.issues)).toBeFalsy();

        if (item.condition) {
            expect(conditions.pending).toBe(true);
            expect(conditions.condition).toBeDefined();
        }

        expect(policy).toEqual(expectation);
    });

    it('does not write into the frozen policies of an identity grant', async () => {
        const grants : PermissionPolicyBinding[] = [
            {
                permission,
                realmScope: 'any',
                policies: [createAttributesPolicy()],
            },
        ];
        const expectation = structuredClone(grants);

        deepFreeze(grants);

        const policy = deepFreeze(definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {}));

        const engine = new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        });

        const data = () : PolicyInput => ({
            ...createAttributesData(),
            [BuiltInPolicyType.IDENTITY]: { ...identity, grants },
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        });

        const settled = await engine.evaluate(policy, definePolicyEvaluationContext({ data: definePolicyData(data()) }));

        expect(toVerdict(settled), JSON.stringify(settled.issues)).toEqual('pass');

        const conditions = await engine.evaluate(policy, definePolicyEvaluationContext({
            data: definePolicyData({
                [BuiltInPolicyType.IDENTITY]: { ...identity, grants },
                [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
            }),
            withConditions: true,
        }));

        expect(toVerdict(conditions), JSON.stringify(conditions.issues)).toEqual('pending');
        expect(conditions.condition).toBeDefined();

        expect(grants).toEqual(expectation);
    });

    it('hands the realm-match evaluator a validator output that does not alias its input', async () => {
        const input = { attributeName: ['realmId'], attributeNameStrict: false };
        const output = await new RealmMatchPolicyValidator().run(input);

        expect(output).not.toBe(input);
        expect(output.attributeName).not.toBe(input.attributeName);
    });

    it('reads an attributes policy through a proxy that refuses writes', async () => {
        const policy = createWriteRefusingProxy(createAttributesPolicy());

        const engine = new PolicyEngine(PolicyDefaultEvaluators);
        const { settled, conditions } = await evaluateThreeWays(engine, policy, createAttributesData);

        expect(toVerdict(settled), JSON.stringify(settled.issues)).toEqual('pass');
        expect(conditions.pending).toBe(true);
        expect(conditions.condition).toBeDefined();
    });
});
