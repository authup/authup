/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicyBinding } from '@authup/access';
import {
    BuiltInPolicyType,
    PolicyData,
} from '@authup/access';
import type { Client, Identity } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import type { IAppEvent } from 'routup';
import { describe, expect, it } from 'vitest';
import {
    RequestPermissionEvaluator,
    buildActorContext,
    setRequestGrantsResolver,
    setRequestIdentity,
    setRequestPermissionEvaluator,
    setRequestScopes,
    useRequestPolicyGrants,
} from '../../../../../src/adapters/http/request';

const grants : PermissionPolicyBinding[] = [{ permission: { name: 'test' }, realmScope: 'any' }];

// The request helpers under test only read/write `event.store`.
function createEvent(): IAppEvent {
    const event = { store: {} } as unknown as IAppEvent;
    setRequestGrantsResolver(event, async () => grants);

    return event;
}

function clientIdentity(data: Partial<Client>): Identity {
    return { type: IdentityType.CLIENT, data: data as Client };
}

describe('RequestPermissionEvaluator', () => {
    it('should not attach identity policy data for a global-scoped request without an identity', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.GLOBAL]);
        // Deliberately no identity — mirrors a Bearer token whose subject was
        // deleted after issuance (issue #3184). Setting `undefined` here would
        // make the built-in identity evaluator throw against undefined data.

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.evaluate({ name: 'test' });

        const ctx = base.evaluateCalls[0];
        expect(ctx.data?.has(BuiltInPolicyType.IDENTITY)).toBeFalsy();
    });

    it('should attach identity policy data when a global-scoped request has an identity', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.GLOBAL]);
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.evaluate({ name: 'test' });

        const ctx = base.evaluateCalls[0];
        expect(ctx.data?.has(BuiltInPolicyType.IDENTITY)).toBe(true);
        expect(ctx.data?.get(BuiltInPolicyType.IDENTITY)).toMatchObject({
            type: 'client', 
            id: 'c1', 
            grants, 
        });
    });

    it('should fail the evaluation when the grants cannot be loaded', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.GLOBAL]);
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));
        setRequestGrantsResolver(event, async () => {
            throw new Error('grant load failed');
        });

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await expect(evaluator.preEvaluate({ name: 'test' })).rejects.toThrow('grant load failed');
        expect(base.preEvaluateCalls).toHaveLength(0);
    });

    // A token's scopes restrict what the identity may DO, never who it is:
    // without `global` the identity still resolves, holding no grant.
    it('should attach the identity without grants when the scopes withhold global', async () => {
        const event = createEvent();
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));
        // No scopes → not global.

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.evaluate({ name: 'test' });

        const ctx = base.evaluateCalls[0];
        expect(ctx.data?.get(BuiltInPolicyType.IDENTITY)).toMatchObject({
            type: 'client',
            id: 'c1',
            grants: [],
        });
    });

    it('should not load the grants when the scopes withhold global', async () => {
        const event = createEvent();
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));
        setRequestGrantsResolver(event, async () => {
            throw new Error('grants must not be loaded');
        });

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await expect(evaluator.preEvaluate({ name: 'test' })).resolves.toBeUndefined();
    });

    // The wrapper is the ONE place the scope condition is spelled, so a caller
    // that fills the bag itself (the batch authorization check passes every
    // identity-reading policy in a tree its identity) can never outrank it: a
    // pre-placed identity, grants and all, is replaced by the request's own,
    // carrying only what its scopes allow.
    it('should strip the grants of a pre-placed identity without global scope', async () => {
        const event = createEvent();
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.preEvaluate({
            name: 'test',
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: {
                    type: 'client', 
                    id: 'c1', 
                    grants, 
                },
                [BuiltInPolicyType.REALM_MATCH]: null,
            }),
        });

        const ctx = base.preEvaluateCalls[0];
        expect(ctx.data?.get(BuiltInPolicyType.IDENTITY)).toMatchObject({
            type: 'client',
            id: 'c1',
            grants: [],
        });
        // the rest of the caller's bag rides on
        expect(ctx.data?.has(BuiltInPolicyType.REALM_MATCH)).toBe(true);
    });

    it('should remove a pre-placed identity when no identity resolved', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.GLOBAL]);

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.preEvaluate({
            name: 'test',
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: {
                    type: 'client', 
                    id: 'c1', 
                    grants, 
                },
            }),
        });

        const ctx = base.preEvaluateCalls[0];
        expect(ctx.data?.has(BuiltInPolicyType.IDENTITY)).toBe(false);
    });

    it('should overwrite a pre-placed identity with the request\'s own', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.GLOBAL]);
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.preEvaluate({
            name: 'test',
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: {
                    type: 'user', 
                    id: 'someone-else', 
                    grants: [], 
                }, 
            }),
        });

        const ctx = base.preEvaluateCalls[0];
        expect(ctx.data?.get(BuiltInPolicyType.IDENTITY)).toMatchObject({
            type: 'client', 
            id: 'c1', 
            grants, 
        });
    });
});

describe('useRequestPolicyGrants', () => {
    it('should resolve the grants for a global-scoped request', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.GLOBAL]);

        await expect(useRequestPolicyGrants(event, { type: 'client', id: 'c1' })).resolves.toEqual(grants);
    });

    it('should resolve no grants when the scopes withhold global', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.OPEN_ID]);

        await expect(useRequestPolicyGrants(event, { type: 'client', id: 'c1' })).resolves.toEqual([]);
    });
});

describe('buildActorContext', () => {
    it('should keep the identity but delegate no grants when the scopes withhold global', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.OPEN_ID]);
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));
        setRequestPermissionEvaluator(event, new RequestPermissionEvaluator(event, new FakePermissionEvaluator()));

        const actor = buildActorContext(event);
        expect(actor.identity).toMatchObject({ type: 'client' });
        await expect(actor.grants?.()).resolves.toEqual([]);
    });
});
