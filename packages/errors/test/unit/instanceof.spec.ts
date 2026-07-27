/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    AUTHUP_ERROR_INSTANCE,
    AuthupError,
    BAD_REQUEST_ERROR_INSTANCE,
    BASE_ERROR_INSTANCE,
    BadRequestError,
    INSTANCEOF_PROPERTY,
    matchesInstanceof,
    serializeInstanceofChain,
} from '../../src';

describe('serializeInstanceofChain', () => {
    it('serializes an instance chain to marker descriptions in order', () => {
        const error = new BadRequestError();

        expect(serializeInstanceofChain(error)).toEqual([
            '@ebec/core/BaseError',
            '@authup/errors/AuthupError',
            '@authup/errors/BadRequestError',
        ]);
    });

    it('returns an empty list for non-objects', () => {
        expect(serializeInstanceofChain(null)).toEqual([]);
        expect(serializeInstanceofChain(undefined)).toEqual([]);
        expect(serializeInstanceofChain('foo')).toEqual([]);
        expect(serializeInstanceofChain(42)).toEqual([]);
    });

    it('returns an empty list for objects without a chain', () => {
        expect(serializeInstanceofChain({})).toEqual([]);
        expect(serializeInstanceofChain(new Error('foo'))).toEqual([]);
    });

    it('returns an empty list for a non-array chain', () => {
        expect(serializeInstanceofChain({ [INSTANCEOF_PROPERTY]: 'foo' })).toEqual([]);
    });

    it('passes string entries through and drops other values', () => {
        const input = {
            [INSTANCEOF_PROPERTY]: [
                Symbol.for('test/foo'),
                'test/bar',
                // eslint-disable-next-line symbol-description
                Symbol(),
                42,
                null,
            ],
        };

        expect(serializeInstanceofChain(input)).toEqual(['test/foo', 'test/bar']);
    });
});

describe('matchesInstanceof', () => {
    it('matches the native symbol chain of an instance', () => {
        const error = new BadRequestError();

        expect(matchesInstanceof(error, BAD_REQUEST_ERROR_INSTANCE)).toBe(true);
        expect(matchesInstanceof(error, AUTHUP_ERROR_INSTANCE)).toBe(true);
        expect(matchesInstanceof(error, BASE_ERROR_INSTANCE)).toBe(true);
    });

    it('matches the serialized string chain of a rehydrated error', () => {
        const rehydrated = JSON.parse(JSON.stringify(new BadRequestError()));

        expect(matchesInstanceof(rehydrated, BAD_REQUEST_ERROR_INSTANCE)).toBe(true);
        expect(matchesInstanceof(rehydrated, AUTHUP_ERROR_INSTANCE)).toBe(true);
        expect(matchesInstanceof(rehydrated, BASE_ERROR_INSTANCE)).toBe(true);
    });

    it('does not match markers outside the chain', () => {
        const error = new AuthupError();
        const rehydrated = JSON.parse(JSON.stringify(error));

        expect(matchesInstanceof(error, BAD_REQUEST_ERROR_INSTANCE)).toBe(false);
        expect(matchesInstanceof(rehydrated, BAD_REQUEST_ERROR_INSTANCE)).toBe(false);
    });

    it('returns false for non-objects and chain-less objects', () => {
        expect(matchesInstanceof(null, AUTHUP_ERROR_INSTANCE)).toBe(false);
        expect(matchesInstanceof('foo', AUTHUP_ERROR_INSTANCE)).toBe(false);
        expect(matchesInstanceof({}, AUTHUP_ERROR_INSTANCE)).toBe(false);
        expect(matchesInstanceof({ [INSTANCEOF_PROPERTY]: 'foo' }, AUTHUP_ERROR_INSTANCE)).toBe(false);
    });

    it('never matches a description-less marker against a string chain', () => {
        const input = { [INSTANCEOF_PROPERTY]: ['undefined'] };

        // eslint-disable-next-line symbol-description
        expect(matchesInstanceof(input, Symbol())).toBe(false);
    });
});
