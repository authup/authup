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
    UpstreamError,
    UpstreamTimeoutError,
    httpStatusFromCode,
    isAuthupError,
    isUpstreamError,
    serializeError,
} from '../../src/index.ts';

describe('UpstreamError', () => {
    it('should carry the upstream_error code, served as a bad gateway', () => {
        const error = new UpstreamError();

        expect(error.code).toEqual(ErrorCode.UPSTREAM_ERROR);
        expect(ErrorCode.UPSTREAM_ERROR).toEqual('upstream_error');
        expect(httpStatusFromCode(ErrorCode.UPSTREAM_ERROR)).toEqual(502);
    });

    it('should keep the cause it was given', () => {
        const cause = new Error('refused');
        const error = new UpstreamError({ cause });

        expect(error.cause).toBe(cause);
    });

    it('should be matched by its guard in process', () => {
        const error = new UpstreamError();

        expect(isUpstreamError(error)).toBe(true);
        expect(isAuthupError(error)).toBe(true);
        expect(isUpstreamError(new InternalError())).toBe(false);
        expect(isUpstreamError(new UpstreamTimeoutError())).toBe(false);
        expect(isUpstreamError(new Error('foo'))).toBe(false);
    });

    it('should be matched by its guard after a JSON round-trip', () => {
        const rehydrated = JSON.parse(JSON.stringify(serializeError(new UpstreamError())));

        expect(isUpstreamError(rehydrated)).toBe(true);
        expect(isAuthupError(rehydrated)).toBe(true);
    });
});
