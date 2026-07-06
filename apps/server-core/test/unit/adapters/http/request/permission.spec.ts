/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import type { Client, Identity } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { FakePermissionEvaluator } from '@authup/server-test-kit';
import type { IAppEvent } from 'routup';
import { describe, expect, it } from 'vitest';
import {
    RequestIdentity,
    RequestPermissionEvaluator,
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
});
