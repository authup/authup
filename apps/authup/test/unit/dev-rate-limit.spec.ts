/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { createConsoleRateLimitSkip, withConsoleRateLimitSkip } from '../../src/dev/index.ts';
import { captureEvent } from '../utils/event.ts';

const BASE_PATHS = ['/console/auth', '/console/admin', '/console/account'];

describe('dev rate limit exemption', () => {
    it('should exempt a console base path', async () => {
        const skip = createConsoleRateLimitSkip(BASE_PATHS);

        expect(skip(await captureEvent('/console/admin'))).toBeTruthy();
    });

    it('should exempt a nested path under a console base path', async () => {
        const skip = createConsoleRateLimitSkip(BASE_PATHS);

        expect(skip(await captureEvent('/console/admin/src/main.ts'))).toBeTruthy();
    });

    it('should not exempt an api path', async () => {
        const skip = createConsoleRateLimitSkip(BASE_PATHS);

        expect(skip(await captureEvent('/jwks'))).toBeFalsy();
    });

    // The console mount is a path SEGMENT boundary, so a base path must never
    // match as a bare string prefix: `/console/adminfoo` is not routed to the
    // admin console, and exempting it would hand out a free unmetered surface.
    it('should not exempt a path that only shares the base path prefix', async () => {
        const skip = createConsoleRateLimitSkip(BASE_PATHS);

        expect(skip(await captureEvent('/console/adminfoo'))).toBeFalsy();
    });

    it('should leave a disabled rate limit middleware disabled', () => {
        expect(withConsoleRateLimitSkip(false, BASE_PATHS)).toBe(false);
    });

    it('should keep the keys an operator supplied', () => {
        const output = withConsoleRateLimitSkip({ windowMs: 1_000 }, BASE_PATHS);

        expect(output).toMatchObject({ windowMs: 1_000 });
        expect(typeof (output as Record<string, any>).skip).toEqual('function');
    });

    it('should supply the predicate alone when nothing was configured', () => {
        const output = withConsoleRateLimitSkip(true, BASE_PATHS);

        expect(Object.keys(output as Record<string, any>)).toEqual(['skip']);
    });
});
