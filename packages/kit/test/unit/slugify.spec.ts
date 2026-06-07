/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { slugify } from '../../src';

describe('slugify', () => {
    it('lowercases and hyphenates non-alphanumeric runs', () => {
        expect(slugify('My Analysis')).toBe('my-analysis');
        expect(slugify('  Hello   World!! ')).toBe('hello-world');
    });

    it('preserves an existing slug', () => {
        expect(slugify('already-slug')).toBe('already-slug');
    });

    it('trims leading and trailing separators', () => {
        expect(slugify('***wrapped***')).toBe('wrapped');
        expect(slugify('--dashes--')).toBe('dashes');
    });

    it('returns an empty string when no alphanumeric characters remain', () => {
        expect(slugify('!!!')).toBe('');
    });
});
