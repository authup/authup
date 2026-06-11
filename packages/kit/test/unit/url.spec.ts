/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { getURLBasePath } from '../../src';

describe('getURLBasePath', () => {
    it('extracts the path prefix of a sub-path URL', () => {
        expect(getURLBasePath('https://example.com/auth')).toBe('/auth');
        expect(getURLBasePath('https://example.com/foo/bar')).toBe('/foo/bar');
    });

    it('strips trailing slashes', () => {
        expect(getURLBasePath('https://example.com/auth/')).toBe('/auth');
        expect(getURLBasePath('https://example.com/auth///')).toBe('/auth');
    });

    it('collapses duplicated leading slashes', () => {
        expect(getURLBasePath('https://example.com//auth')).toBe('/auth');
        expect(getURLBasePath('https://example.com///auth/')).toBe('/auth');
        expect(getURLBasePath('https://example.com//')).toBe('');
    });

    it('returns an empty string for root-level URLs', () => {
        expect(getURLBasePath('https://example.com')).toBe('');
        expect(getURLBasePath('https://example.com/')).toBe('');
    });

    it('returns an empty string for missing or invalid input', () => {
        expect(getURLBasePath()).toBe('');
        expect(getURLBasePath('')).toBe('');
        expect(getURLBasePath('not a url')).toBe('');
    });

    it('ignores query and hash', () => {
        expect(getURLBasePath('https://example.com/auth?foo=bar#baz')).toBe('/auth');
    });
});
