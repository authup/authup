/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isClientError } from 'hapic';
import { expect } from 'vitest';

type ExpectedClientError = {
    /**
     * Expected HTTP status code (e.g. 400, 403).
     */
    status?: number,
    /**
     * Shorthand for `data: { code }`.
     */
    code?: string,
    /**
     * Additional fields to assert on `response.data` (deep equality per key).
     * Useful for OAuth2 errors where both `code` and `error` are surfaced.
     */
    data?: Record<string, any>,
};

/**
 * Asserts that the supplied async call rejects with a hapic `ClientError`
 * matching the given HTTP status and response body shape.
 *
 * Replaces the recurring `expect.assertions(N) + try/catch + isClientError`
 * shape found across token-grant and entity test suites.
 */
export async function expectClientError<T>(
    fn: () => Promise<T>,
    expected: ExpectedClientError,
): Promise<void> {
    let error: unknown;
    try {
        await fn();
    } catch (e) {
        error = e;
    }

    if (typeof error === 'undefined') {
        throw new Error(`Expected ClientError matching ${JSON.stringify(expected)}, but call resolved.`);
    }

    if (!isClientError(error)) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Expected ClientError, got: ${message}`);
    }

    if (typeof expected.status !== 'undefined') {
        expect(error.status).toEqual(expected.status);
    }

    if (typeof expected.code !== 'undefined') {
        expect(error?.response?.data?.code).toEqual(expected.code);
    }

    if (expected.data) {
        for (const [key, value] of Object.entries(expected.data)) {
            expect(error?.response?.data?.[key]).toEqual(value);
        }
    }
}
