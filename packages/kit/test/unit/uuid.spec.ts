/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isUUID } from '../../src/index.ts';

describe('isUUID', () => {
    it('accepts a v4 id', () => {
        expect(isUUID(crypto.randomUUID())).toBe(true);
        expect(isUUID('a7c9a1d2-6f4b-4c1e-9d8a-2b3c4d5e6f70')).toBe(true);
    });

    it('accepts the RFC 9562 versions 6 to 8', () => {
        expect(isUUID('1ef21d2f-1207-6660-8c4f-419efbd44d48')).toBe(true);
        expect(isUUID('019b0000-0000-7000-8000-000000000001')).toBe(true);
        expect(isUUID('017f22e2-79b0-7cc3-98c4-dc0c0c07398f')).toBe(true);
        expect(isUUID('2489e9ad-2ee2-8e00-8ec9-32d5f69181c0')).toBe(true);
    });

    it('accepts upper case', () => {
        expect(isUUID('019B0000-0000-7000-8000-000000000001')).toBe(true);
    });

    it('keeps accepting the nil uuid', () => {
        expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('refuses a version nibble above 8', () => {
        expect(isUUID('019b0000-0000-9000-8000-000000000001')).toBe(false);
        expect(isUUID('019b0000-0000-f000-8000-000000000001')).toBe(false);
    });

    it('refuses a variant outside [089ab]', () => {
        expect(isUUID('019b0000-0000-7000-c000-000000000001')).toBe(false);
    });

    it('refuses other shapes', () => {
        expect(isUUID('')).toBe(false);
        expect(isUUID('admin')).toBe(false);
        expect(isUUID('019b0000000070008000000000000001')).toBe(false);
        expect(isUUID('019b0000-0000-7000-8000-0000000000011')).toBe(false);
    });
});
