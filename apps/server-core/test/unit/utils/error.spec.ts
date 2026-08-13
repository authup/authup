/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { ErrorCode } from '@authup/errors';
import { NotFoundError } from '@ebec/http';
import type { Response as HapicResponse, RequestOptions } from 'hapic';
import { createClientError } from 'hapic';
import { describeError, sanitizeError } from '../../../src/utils';

const UPSTREAM_URL = 'https://upstream.test/token';

const request: RequestOptions = { method: 'POST', url: UPSTREAM_URL };

/**
 * Mirrors what hapic's transport builds for a 4xx/5xx answer: the decoded
 * body is attached to the `Response` through a getter, so it is a
 * non-enumerable property a spread would not carry.
 */
function createUpstreamResponseError(body: unknown, status = 400) {
    const response = new Response(null, { status, statusText: 'Bad Request' }) as HapicResponse;
    Object.defineProperty(response, 'data', { get: () => body });

    return createClientError({ request, response });
}

/**
 * Mirrors a transport failure: undici throws `TypeError: fetch failed`
 * whose own `cause` is the syscall error naming the actual reason.
 */
function createUpstreamNetworkError() {
    const syscall = Object.assign(new Error('connect ECONNREFUSED 193.196.29.104:80'), {
        code: 'ECONNREFUSED',
        syscall: 'connect',
        address: '193.196.29.104',
        port: 80,
    });

    return createClientError({
        request,
        error: new TypeError('fetch failed', { cause: syscall }),
    });
}

describe('src/utils/error', () => {
    describe('sanitizeError', () => {
        it('should map an upstream response failure to an upstream error', () => {
            const error = sanitizeError(createUpstreamResponseError({ error: 'invalid_request' }));

            expect(error.code).toEqual(ErrorCode.UPSTREAM_ERROR);
        });

        it('should map an upstream transport failure to an upstream error', () => {
            const error = sanitizeError(createUpstreamNetworkError());

            expect(error.code).toEqual(ErrorCode.UPSTREAM_ERROR);
        });

        it('should not expose the upstream url on an upstream error', () => {
            const error = sanitizeError(createUpstreamResponseError({ error: 'invalid_request' }));

            expect(error.message).not.toContain(UPSTREAM_URL);
        });

        it('should still map a framework http error by its status', () => {
            const error = sanitizeError(new NotFoundError());

            expect(error.code).toEqual(ErrorCode.ENTITY_NOT_FOUND);
        });
    });

    describe('describeError', () => {
        it('should describe the upstream status and body', () => {
            const output = describeError(createUpstreamResponseError({
                error: 'invalid_request',
                error_description: 'redirect_uri mismatch',
            }));

            expect(output).toContain('upstream status: 400');
            expect(output).toContain('"error":"invalid_request"');
            expect(output).toContain('redirect_uri mismatch');
        });

        it('should describe the cause chain down to the syscall reason', () => {
            const output = describeError(createUpstreamNetworkError());

            expect(output).toContain('fetch failed');
            expect(output).toContain('connect ECONNREFUSED 193.196.29.104:80');
            expect(output).toContain('ECONNREFUSED');
        });

        it('should prepend the headline when one is supplied', () => {
            const output = describeError(new Error('boom'), 'token exchange failed');

            expect(output.startsWith('token exchange failed')).toBeTruthy();
            expect(output).toContain('boom');
        });

        it('should truncate an oversized upstream body', () => {
            const output = describeError(createUpstreamResponseError('x'.repeat(4000)));

            expect(output.length).toBeLessThan(3000);
        });

        it('should terminate on a cyclic cause chain', () => {
            const first = new Error('first');
            const second = new Error('second', { cause: first });
            first.cause = second;

            const output = describeError(first);

            expect(output).toContain('second');
        });

        it('should describe an arbitrary thrown value', () => {
            expect(describeError('boom')).toContain('boom');
        });
    });
});
