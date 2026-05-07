/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BearerTokenMalformedError, ErrorCode } from '@authup/errors';
import { describe, expect, it } from 'vitest';
import { extractBearerToken } from '../../src';

describe('extractBearerToken', () => {
    it('should return the token for a well-formed Bearer header', () => {
        const token = extractBearerToken('Bearer abc.def.ghi');
        expect(token).toBe('abc.def.ghi');
    });

    it('should return undefined when the header is missing', () => {
        expect(extractBearerToken(undefined)).toBeUndefined();
    });

    it('should return undefined when the header is not a string', () => {
        expect(extractBearerToken(null as unknown as string)).toBeUndefined();
    });

    it('should throw when the header has no space separator', () => {
        let caught: unknown;
        try {
            extractBearerToken('BearerNoSpace');
        } catch (e) {
            caught = e;
        }

        expect(caught).toBeInstanceOf(BearerTokenMalformedError);
        expect((caught as BearerTokenMalformedError).code).toBe(
            ErrorCode.HTTP_BEARER_TOKEN_MALFORMED,
        );
    });

    it('should throw when the scheme is not Bearer', () => {
        let caught: unknown;
        try {
            extractBearerToken('Basic dXNlcjpwYXNz');
        } catch (e) {
            caught = e;
        }

        expect(caught).toBeInstanceOf(BearerTokenMalformedError);
    });

    it('should throw when the token value is empty', () => {
        let caught: unknown;
        try {
            extractBearerToken('Bearer ');
        } catch (e) {
            caught = e;
        }

        expect(caught).toBeInstanceOf(BearerTokenMalformedError);
    });
});
