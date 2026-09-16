/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import type { Client, Identity } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import type { IAppEvent } from 'routup';
import { describe, expect, it } from 'vitest';
import {
    RequestIdentity,
    RequestPermissionEvaluator,
    setRequestClientId,
    setRequestIdentity,
    setRequestScopes,
} from '../../../../../src/adapters/http/request';

// The request helpers under test only read/write `event.store`.
function createEvent(): IAppEvent {
    return { store: {} } as unknown as IAppEvent;
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
        expect(ctx.data?.get(BuiltInPolicyType.IDENTITY)).toBeInstanceOf(RequestIdentity);
    });

    it('should not attach identity policy data without global scope', async () => {
        const event = createEvent();
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));
        // No scopes → not global.

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.evaluate({ name: 'test' });

        const ctx = base.evaluateCalls[0];
        expect(ctx.data?.has(BuiltInPolicyType.IDENTITY)).toBeFalsy();
    });

    // The wrapper is the ONE place the scope condition is spelled, so a caller
    // that fills the bag itself (the batch authorization check passes every
    // identity-reading policy in a tree its identity) can never outrank it: an
    // attach alone would leave a scope-restricted bearer answered as a
    // fully-scoped one wherever the key was pre-placed.
    it('should remove a pre-placed identity without global scope', async () => {
        const event = createEvent();
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.preEvaluate({
            name: 'test',
            data: new PolicyData({
                [BuiltInPolicyType.IDENTITY]: { type: 'client', id: 'c1' },
                [BuiltInPolicyType.REALM_MATCH]: null,
            }),
        });

        const ctx = base.preEvaluateCalls[0];
        expect(ctx.data?.has(BuiltInPolicyType.IDENTITY)).toBe(false);
        // only the identity is withheld; the rest of the caller's bag rides on
        expect(ctx.data?.has(BuiltInPolicyType.REALM_MATCH)).toBe(true);
    });

    it('should overwrite a pre-placed identity with the request\'s own', async () => {
        const event = createEvent();
        setRequestScopes(event, [ScopeName.GLOBAL]);
        setRequestIdentity(event, clientIdentity({ id: 'c1' }));

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.preEvaluate({
            name: 'test',
            data: new PolicyData({ [BuiltInPolicyType.IDENTITY]: { type: 'user', id: 'someone-else' } }),
        });

        const ctx = base.preEvaluateCalls[0];
        expect(ctx.data?.get(BuiltInPolicyType.IDENTITY)).toBeInstanceOf(RequestIdentity);
    });

    // The token's client is stamped from the verified request on every
    // entry point and never taken from the caller: a service must not be able
    // to widen a narrowed token, nor narrow another one, by supplying it.
    it('should stamp the request\'s token client over a caller-supplied one', async () => {
        const event = createEvent();
        setRequestClientId(event, 'x');

        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(event, base);

        await evaluator.evaluate({ name: 'test', tokenClientId: 'forged' });
        await evaluator.evaluateOneOf({ name: 'test', tokenClientId: 'forged' });
        await evaluator.preEvaluate({ name: 'test', tokenClientId: 'forged' });
        await evaluator.preEvaluateOneOf({ name: 'test', tokenClientId: 'forged' });
        await evaluator.compile({ name: 'test', tokenClientId: 'forged' });

        expect([
            ...base.evaluateCalls,
            ...base.evaluateOneOfCalls,
            ...base.preEvaluateCalls,
            ...base.preEvaluateOneOfCalls,
            ...base.compileCalls,
        ].map((ctx) => ctx.tokenClientId)).toEqual(['x', 'x', 'x', 'x', 'x']);
    });

    it('should clear a caller-supplied token client when the request carries none', async () => {
        const base = new FakePermissionEvaluator();
        const evaluator = new RequestPermissionEvaluator(createEvent(), base);

        await evaluator.evaluate({ name: 'test', tokenClientId: 'forged' });

        expect(base.evaluateCalls[0].tokenClientId).toBeNull();
    });
});
