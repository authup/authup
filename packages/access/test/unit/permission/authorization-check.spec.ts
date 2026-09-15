/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { AuthorizationCheckPermissions, IdentityPolicyData } from '../../../src';
import {
    BuiltInPolicyType,
    createAuthorizationCheckEvaluator,
    definePolicyData,
} from '../../../src';

const REALM_ID = '2e0d4d2a-1b25-4a2a-9a9f-5a29b1a67b21';
const REALM_NAME = 'tenant';
const FOREIGN_REALM_ID = '9f3c0f4d-2a4b-4b8b-8b1e-1f2a3b4c5d6e';

const identity : IdentityPolicyData = {
    type: 'user',
    id: 'c0ffee00-0000-4000-8000-000000000001',
    realmId: REALM_ID,
    realmName: REALM_NAME,
};

const result : AuthorizationCheckPermissions = [
    { name: 'user_update', realms: [REALM_ID] },
    { name: 'user_read', realms: [REALM_ID, null] },
    { name: 'realm_read', realms: [REALM_ID, null, FOREIGN_REALM_ID] },
];

async function buildEvaluator(input: AuthorizationCheckPermissions = result) {
    return createAuthorizationCheckEvaluator({ permissions: input, identity });
}

function withRealm(value: string | string[] | null) {
    return definePolicyData({ [BuiltInPolicyType.REALM_MATCH]: value });
}

describe('permission/authorization/check-evaluator', () => {
    it('holds a permission that reached at least one requested realm', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.preEvaluate({ name: 'user_update' })).resolves.toBeUndefined();
        await expect(evaluator.preEvaluateOneOf({ name: ['user_update', 'nope'] })).resolves.toBeUndefined();
    });

    it('denies a permission absent from the answer', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.preEvaluate({ name: 'client_delete' })).rejects.toThrow();
        await expect(evaluator.preEvaluateOneOf({ name: ['client_delete', 'user_delete'] })).rejects.toThrow();
    });

    it('requires every name for the unanimous form', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.preEvaluate({ name: ['user_read', 'user_update'] })).resolves.toBeUndefined();
        await expect(evaluator.preEvaluate({ name: ['user_read', 'client_delete'] })).rejects.toThrow();
    });

    it('matches the own realm by id and by name', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.preEvaluate({
            name: 'user_update',
            data: withRealm(REALM_ID),
        })).resolves.toBeUndefined();

        await expect(evaluator.preEvaluate({
            name: 'user_update',
            data: withRealm(REALM_NAME),
        })).resolves.toBeUndefined();
    });

    it('denies a global resource for a permission held in the own realm only', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.preEvaluate({
            name: 'user_update',
            data: withRealm(null),
        })).rejects.toThrow();

        await expect(evaluator.preEvaluate({
            name: 'user_read',
            data: withRealm(null),
        })).resolves.toBeUndefined();
    });

    it('denies a realm the request never asked about', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.preEvaluate({
            name: 'user_read',
            data: withRealm(FOREIGN_REALM_ID),
        })).rejects.toThrow();

        await expect(evaluator.preEvaluate({
            name: 'realm_read',
            data: withRealm(FOREIGN_REALM_ID),
        })).resolves.toBeUndefined();
    });

    // a resource spanning several realms needs the scope to reach EVERY one of
    // them, the rule `realmScopeMatches` applies, and an empty set fails closed
    it('requires every realm of an array resource and fails closed on an empty one', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.preEvaluate({
            name: 'realm_read',
            data: withRealm([REALM_ID, FOREIGN_REALM_ID]),
        })).resolves.toBeUndefined();

        await expect(evaluator.preEvaluate({
            name: 'user_read',
            data: withRealm([REALM_ID, FOREIGN_REALM_ID]),
        })).rejects.toThrow();

        await expect(evaluator.preEvaluate({
            name: 'user_read',
            data: withRealm([]),
        })).rejects.toThrow();
    });

    it('answers the pre-gate verdict for evaluate, an upper bound', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.evaluate({
            name: 'user_update',
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { realmId: REALM_ID } }),
        })).resolves.toBeUndefined();

        await expect(evaluator.evaluateOneOf({ name: ['client_delete'] })).rejects.toThrow();
    });

    it('compiles to deny for a permission it does not hold, and to post otherwise', async () => {
        const evaluator = await buildEvaluator();

        await expect(evaluator.compile({ name: 'client_delete' })).resolves.toEqual({ verdict: 'deny' });
        await expect(evaluator.compile({ name: 'user_read' })).resolves.toEqual({ verdict: 'post' });
    });

    it('denies every check without an identity, since a realm key cannot resolve', async () => {
        const evaluator = await createAuthorizationCheckEvaluator({ permissions: result });

        await expect(evaluator.preEvaluate({ name: 'user_read' })).resolves.toBeUndefined();
        await expect(evaluator.preEvaluate({
            name: 'user_read',
            data: withRealm(REALM_NAME),
        })).rejects.toThrow();
    });

    it('refuses a malformed answer', async () => {
        await expect(createAuthorizationCheckEvaluator({ permissions: [{ name: 'user_read' }] })).rejects.toThrow();

        await expect(createAuthorizationCheckEvaluator({ permissions: [{ name: 'user_read', realms: [] }] })).rejects.toThrow();

        await expect(createAuthorizationCheckEvaluator({ permissions: { user_read: ['x'] } })).rejects.toThrow();
    });

    // The PATH is what discriminates the reason: the duplicate refusal points at
    // the SECOND entry's name, where a schema failure carries no index at all.
    it('refuses a permission answered more than once', async () => {
        await expect(createAuthorizationCheckEvaluator({
            permissions: [
                { name: 'user_read', realms: [REALM_ID] },
                { name: 'user_read', realms: [null] },
            ],
        })).rejects.toThrow(/permissions\[1\]\.name/);
    });

    it('does not adopt a later mutation of the answer it was given', async () => {
        const mutable : AuthorizationCheckPermissions = [{ name: 'user_read', realms: [REALM_ID] }];
        const evaluator = await createAuthorizationCheckEvaluator({ permissions: mutable, identity });

        mutable.push({ name: 'client_delete', realms: [REALM_ID] });

        await expect(evaluator.preEvaluate({ name: 'client_delete' })).rejects.toThrow();
    });
});
