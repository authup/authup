/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { OAuth2Error, OAuth2ErrorCode } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { toOAuth2Error } from '../../../../../src/core/oauth2/helpers/erorr.ts';

describe('toOAuth2Error', () => {
    it('should pass through OAuth2Error unchanged', () => {
        const err = OAuth2Error.grantInvalid();
        const result = toOAuth2Error(err);
        expect(result).toBe(err);
        expect(result).toBeInstanceOf(OAuth2Error);
    });

    it('should wrap AuthupError with OAuth2 data', () => {
        const err = new AuthupError({ message: 'something failed', statusCode: 400 });
        const result = toOAuth2Error(err);
        expect(result).toBe(err);
        expect(result).toBeInstanceOf(AuthupError);
        expect(result.data).toEqual(expect.objectContaining({
            error: OAuth2ErrorCode.INVALID_REQUEST,
            error_description: 'something failed',
        }));
    });

    it('should preserve existing data on AuthupError', () => {
        const err = new AuthupError({
            message: 'test',
            statusCode: 400,
            data: { hint: 'some hint' },
        });
        const result = toOAuth2Error(err);
        expect(result.data).toEqual(expect.objectContaining({
            error: OAuth2ErrorCode.INVALID_REQUEST,
            error_description: 'test',
            hint: 'some hint',
        }));
    });

    it('should sanitize unknown errors and wrap with OAuth2 data', () => {
        const err = new Error('unknown failure');
        const result = toOAuth2Error(err);
        expect(result).toBeInstanceOf(AuthupError);
        expect(result.data).toEqual(expect.objectContaining({
            error: OAuth2ErrorCode.INVALID_REQUEST,
        }));
    });

    it('should handle non-object errors', () => {
        const result = toOAuth2Error('string error');
        expect(result).toBeInstanceOf(AuthupError);
        expect(result.data).toEqual(expect.objectContaining({
            error: OAuth2ErrorCode.INVALID_REQUEST,
        }));
    });
});
