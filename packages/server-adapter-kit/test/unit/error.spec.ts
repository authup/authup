/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import { JWTError, isJWTError } from '@authup/specs';
import { VouchlyError, VouchlyErrorCode, isVouchlyError } from 'vouchly';
import { describe, expect, it } from 'vitest';
import { toJWTError } from '../../src/verifier/error';

describe('toJWTError', () => {
    it('maps an expired token onto expired_token', () => {
        const output = toJWTError(new VouchlyError(VouchlyErrorCode.TOKEN_EXPIRED));

        expect(output).toBeInstanceOf(JWTError);
        expect(output.code).toEqual(ErrorCode.JWT_EXPIRED);
    });

    it('maps an inactive token onto inactive_token', () => {
        const output = toJWTError(new VouchlyError(VouchlyErrorCode.TOKEN_INACTIVE));

        expect(output).toBeInstanceOf(JWTError);
        expect(output.code).toEqual(ErrorCode.JWT_INACTIVE);
    });

    it.each(Object.values(VouchlyErrorCode).filter((code) => code !== VouchlyErrorCode.TOKEN_EXPIRED &&
        code !== VouchlyErrorCode.TOKEN_INACTIVE))('maps %s onto invalid_token with the vouchly message', (code) => {
        const output = toJWTError(new VouchlyError(code, `message of ${code}`));

        expect(output).toBeInstanceOf(JWTError);
        expect(isVouchlyError(output)).toBe(false);
        expect(output.code).toEqual(ErrorCode.JWT_INVALID);
        expect(output.message).toEqual(`message of ${code}`);
    });

    it('unwraps a JWTError a key source raised', () => {
        const cause = JWTError.headerPropertyInvalid('kid');
        const output = toJWTError(new VouchlyError(VouchlyErrorCode.KEY_UNAVAILABLE, 'unavailable', { cause }));

        expect(output).toBe(cause);
    });

    it('passes a JWTError through', () => {
        const input = JWTError.expired();

        expect(toJWTError(input)).toBe(input);
    });

    it('maps a foreign error onto invalid_token', () => {
        const output = toJWTError(new TypeError('boom'));

        expect(isJWTError(output)).toBe(true);
        expect(output.code).toEqual(ErrorCode.JWT_INVALID);
    });

    it('maps a thrown non-error onto invalid_token', () => {
        const output = toJWTError('boom');

        expect(isJWTError(output)).toBe(true);
        expect(output.code).toEqual(ErrorCode.JWT_INVALID);
    });
});
