/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    ErrorCode,
    InternalError,
    UpstreamTimeoutError,
    httpStatusFromCode,
    isAuthupError,
    isUpstreamTimeoutError,
    serializeError,
} from '../../src';

describe('UpstreamTimeoutError', () => {
    it('should carry the upstream_timeout code, served as a gateway timeout', () => {
        const error = new UpstreamTimeoutError();

        expect(error.code).toEqual(ErrorCode.UPSTREAM_TIMEOUT);
        expect(ErrorCode.UPSTREAM_TIMEOUT).toEqual('upstream_timeout');
        expect(httpStatusFromCode(ErrorCode.UPSTREAM_TIMEOUT)).toEqual(504);
    });

    it('should keep the cause it was given', () => {
        const cause = new Error('stalled');
        const error = new UpstreamTimeoutError({ cause });

        expect(error.cause).toBe(cause);
    });

    it('should be matched by its guard in process', () => {
        const error = new UpstreamTimeoutError();

        expect(isUpstreamTimeoutError(error)).toBe(true);
        expect(isAuthupError(error)).toBe(true);
        expect(isUpstreamTimeoutError(new InternalError())).toBe(false);
        expect(isUpstreamTimeoutError(new Error('foo'))).toBe(false);
    });

    it('should be matched by its guard after a JSON round-trip', () => {
        const rehydrated = JSON.parse(JSON.stringify(serializeError(new UpstreamTimeoutError())));

        expect(isUpstreamTimeoutError(rehydrated)).toBe(true);
        expect(isAuthupError(rehydrated)).toBe(true);
    });
});
