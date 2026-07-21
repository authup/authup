/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildURL, getURLBasePath } from '../../src';

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

describe('buildURL', () => {
    it('preserves the base sub-path when it has no trailing slash', () => {
        expect(buildURL('https://example.com/api', 'authorize').href)
            .toBe('https://example.com/api/authorize');
    });

    it('preserves the base sub-path when it already ends with a slash', () => {
        expect(buildURL('https://example.com/api/', 'authorize').href)
            .toBe('https://example.com/api/authorize');
    });

    it('handles a base without a sub-path', () => {
        expect(buildURL('https://example.com', 'authorize').href)
            .toBe('https://example.com/authorize');
    });

    it('keeps a trailing slash on the appended path', () => {
        expect(buildURL('https://example.com/api', 'docs/').href)
            .toBe('https://example.com/api/docs/');
    });

    it('strips a leading slash off the path so the sub-path is not reset', () => {
        expect(buildURL('https://example.com/api', '/authorize').href)
            .toBe('https://example.com/api/authorize');
    });

    it('returns a mutable URL whose searchParams can be set', () => {
        const url = buildURL('https://example.com/api', 'authorize');
        url.searchParams.set('client_id', 'abc');

        expect(url.href).toBe('https://example.com/api/authorize?client_id=abc');
    });

    it('throws for an absent or invalid base', () => {
        expect(() => buildURL(undefined, 'authorize')).toThrow();
        expect(() => buildURL('', 'authorize')).toThrow();
    });
});
