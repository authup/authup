/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { ErrorCode, httpStatusFromCode } from '../../src';

describe('src/status', () => {
    it('should serve an upstream failure as a bad gateway', () => {
        expect(httpStatusFromCode(ErrorCode.UPSTREAM_ERROR)).toEqual(502);
    });

    it('should fall back to bad request for an unknown code', () => {
        expect(httpStatusFromCode('something_unmapped')).toEqual(400);
    });

    // A bearer the server cannot accept is 401 (RFC 6750 3.1), not the
    // unlisted-code 400 fallback these three used to take. That left a dead
    // bearer answering 400 while a MISSING one answered 401, so no client
    // could tell "your credential died" from "your request was malformed".
    it.each([
        ErrorCode.JWT_EXPIRED,
        ErrorCode.JWT_INACTIVE,
        ErrorCode.JWT_INVALID,
        ErrorCode.IDENTITY_UNAUTHORIZED,
    ])('should serve %s as unauthorized', (code) => {
        expect(httpStatusFromCode(code)).toEqual(401);
    });
});

