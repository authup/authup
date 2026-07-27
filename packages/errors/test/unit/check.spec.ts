/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    AuthHeaderError,
    BadRequestError,
    ErrorCode,
    INSTANCEOF_PROPERTY,
    UnauthorizedError,
    ValidationError,
    isAuthHeaderError,
    isAuthupError,
    isBadRequestError,
    isUnauthorizedError,
    isValidationError,
    serializeError,
} from '../../src';

const roundtrip = (input: unknown) => JSON.parse(JSON.stringify(input));

describe('AuthupError.toJSON', () => {
    it('emits the serialized marker chain', () => {
        const output = new BadRequestError().toJSON();

        expect(output[INSTANCEOF_PROPERTY]).toEqual([
            '@ebec/core/BaseError',
            '@authup/errors/AuthupError',
            '@authup/errors/BadRequestError',
        ]);
    });

    it('keeps code, issues and data alongside the chain', () => {
        const error = new BadRequestError({ data: { foo: 'bar' } });
        const output = error.toJSON();

        expect(output.code).toEqual(ErrorCode.BAD_REQUEST);
        expect(output.issues).toEqual([]);
        expect(output).toMatchObject({ foo: 'bar' });
    });

    it('does not let a data key displace the genuine chain', () => {
        const error = new BadRequestError({ data: { [INSTANCEOF_PROPERTY]: ['@authup/errors/InternalError'] } });

        expect(error.toJSON()[INSTANCEOF_PROPERTY]).toEqual([
            '@ebec/core/BaseError',
            '@authup/errors/AuthupError',
            '@authup/errors/BadRequestError',
        ]);
    });
});

describe('duck-type guards (in-process)', () => {
    it('matches instances and subclass instances', () => {
        const error = new AuthHeaderError('unsupported');

        expect(isAuthHeaderError(error)).toBe(true);
        expect(isUnauthorizedError(error)).toBe(true);
        expect(isAuthupError(error)).toBe(true);
        expect(isBadRequestError(error)).toBe(false);
    });
});

describe('duck-type guards (JSON-rehydrated)', () => {
    it('matches a rehydrated error by its own marker', () => {
        const rehydrated = roundtrip(new BadRequestError());

        expect(isBadRequestError(rehydrated)).toBe(true);
        expect(isAuthupError(rehydrated)).toBe(true);
    });

    it('keeps the inheritance match for rehydrated subclass errors', () => {
        // AuthHeaderError extends UnauthorizedError with a different code —
        // pre-chain-serialization, the slow path missed the ancestor match.
        const rehydrated = roundtrip(new AuthHeaderError('unsupported'));

        expect(rehydrated.code).toEqual(ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED);
        expect(isAuthHeaderError(rehydrated)).toBe(true);
        expect(isUnauthorizedError(rehydrated)).toBe(true);
        expect(isAuthupError(rehydrated)).toBe(true);
        expect(isBadRequestError(rehydrated)).toBe(false);
        expect(isValidationError(rehydrated)).toBe(false);
    });

    it('keeps the code-level match for sibling classes sharing a code', () => {
        // BadRequestError and ValidationError share ErrorCode.BAD_REQUEST, so
        // their guards accept either sibling through the code slow path —
        // in-process and rehydrated alike (pre-existing, unchanged by the
        // chain fast path, which only ever adds matches).
        const rehydrated = roundtrip(new ValidationError());

        expect(isValidationError(rehydrated)).toBe(true);
        expect(isBadRequestError(rehydrated)).toBe(true);
        expect(isBadRequestError(new ValidationError())).toBe(true);
    });

    it('survives a second serialization round-trip', () => {
        const rehydrated = roundtrip(roundtrip(new AuthHeaderError('unsupported')));

        expect(isUnauthorizedError(rehydrated)).toBe(true);
        expect(isAuthHeaderError(rehydrated)).toBe(true);
    });

    it('falls back to the leaf code match for chain-less legacy payloads', () => {
        const legacy = {
            name: 'BadRequestError',
            message: 'foo',
            code: ErrorCode.BAD_REQUEST,
            issues: [],
        };

        expect(isBadRequestError(legacy)).toBe(true);
        expect(isAuthupError(legacy)).toBe(true);

        const legacySubclass = {
            name: 'AuthHeaderError',
            message: 'foo',
            code: ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED,
            issues: [],
        };

        expect(isAuthHeaderError(legacySubclass)).toBe(true);
        // Leaf-only: without the chain, the ancestor match stays unavailable.
        expect(isUnauthorizedError(legacySubclass)).toBe(false);
    });
});

describe('serializeError', () => {
    it('embeds the serialized chain for AuthupError instances', () => {
        const output = serializeError(new UnauthorizedError());

        expect(output[INSTANCEOF_PROPERTY]).toEqual([
            '@ebec/core/BaseError',
            '@authup/errors/AuthupError',
            '@authup/errors/UnauthorizedError',
        ]);
        expect(output.code).toEqual(ErrorCode.IDENTITY_UNAUTHORIZED);
    });
});
