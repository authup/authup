/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../../src';

describe('serialize', () => {
    it.each([
        '123',
        '1e3',
        'true',
        'null',
        'NULL',
        'Undefined',
        'hello',
        '"a"',
        'v1.key.payload',
    ])('round-trips the string %s', (value) => {
        expect(deserialize(serialize(value))).toBe(value);
    });

    it.each([
        123,
        true,
        false,
        null,
        ['a', 'b'],
        { a: 1 },
    ])('round-trips %j', (value) => {
        expect(deserialize(serialize(value))).toEqual(value);
    });

    it('reads a legacy bare string as before', () => {
        expect(deserialize('123')).toBe(123);
        expect(deserialize('hello')).toBe('hello');
    });
});
