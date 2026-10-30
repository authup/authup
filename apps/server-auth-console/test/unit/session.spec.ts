/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { describe, expect, it } from 'vitest';
import { createSessionForwardingGuard } from '../../src';

type ErrorHook = (err: unknown) => unknown;

// The guard only registers a `responseError` hook, so a stand-in that keeps
// the hook is enough to drive it the way hapic does.
function createStubClient() {
    const hooks : ErrorHook[] = [];
    const client = {
        on(name: string, fn: ErrorHook) {
            expect(name).toEqual('responseError');
            hooks.push(fn);

            return hooks.length - 1;
        },
    } as unknown as Client;

    const fail = (status: number, code?: string) => {
        const err = { response: { status, data: code ? { code } : {} } };

        expect(() => hooks.forEach((hook) => hook(err))).toThrow();
    };

    return { client, fail };
}

describe('createSessionForwardingGuard', () => {
    it('should stop forwarding once the API refused enough bearers', () => {
        const guard = createSessionForwardingGuard({ max: 3, now: () => 1000 });
        const { client, fail } = createStubClient();

        guard.observe(client);

        for (let i = 0; i < 2; i++) {
            guard.reserve()!();
            fail(401, ErrorCode.JWT_INVALID);
        }

        const third = guard.reserve();

        expect(third).toBeDefined();
        third!();
        fail(401, ErrorCode.JWT_INVALID);

        expect(guard.reserve()).toBeUndefined();
    });

    it('should count renders still waiting for the API against the limit', () => {
        const guard = createSessionForwardingGuard({ max: 3, now: () => 1000 });

        // a burst of parallel renders, none answered yet
        const reservations = [guard.reserve(), guard.reserve(), guard.reserve()];

        expect(reservations.every((release) => typeof release === 'function')).toBeTruthy();
        expect(guard.reserve()).toBeUndefined();

        // a render that ends unrefused hands its slot back, once
        reservations[0]!();
        reservations[0]!();
        expect(guard.reserve()).toBeDefined();
        expect(guard.reserve()).toBeUndefined();
    });

    it('should forward again in the next window', () => {
        let time = 1000;
        const guard = createSessionForwardingGuard({
            max: 1,
            window: 60_000,
            now: () => time,
        });
        const { client, fail } = createStubClient();

        guard.observe(client);

        guard.reserve()!();
        fail(401, ErrorCode.JWT_INVALID);
        expect(guard.reserve()).toBeUndefined();

        time += 60_000;
        expect(guard.reserve()).toBeDefined();
    });

    it.each([
        ['an expired token', 401, ErrorCode.JWT_EXPIRED],
        ['a revoked token or an inactive signing key', 401, ErrorCode.JWT_INACTIVE],
        ['a refusal that is not a 401', 403, ErrorCode.JWT_INVALID],
    ])('should not count %s', (_label, status, code) => {
        const guard = createSessionForwardingGuard({ max: 1, now: () => 1000 });
        const { client, fail } = createStubClient();

        guard.observe(client);

        guard.reserve()!();
        fail(status, code);
        expect(guard.reserve()).toBeDefined();
    });

    it('should hand the error on to the next hook', () => {
        const guard = createSessionForwardingGuard();
        const { client } = createStubClient();
        let hook : ErrorHook | undefined;

        (client as any).on = (_name: string, fn: ErrorHook) => {
            hook = fn;

            return 0;
        };
        guard.observe(client);

        const err = { response: { status: 401, data: {} } };

        expect(() => hook!(err)).toThrow();

        try {
            hook!(err);
        } catch (e) {
            expect(e).toBe(err);
        }
    });
});
