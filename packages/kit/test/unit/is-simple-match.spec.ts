/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isSimpleMatch } from '../../src';

describe('is-simple-match', () => {
    it('should match equal string', () => {
        expect(isSimpleMatch('test', 'test')).toBeTruthy();
    });

    it('should match with single glob', () => {
        expect(isSimpleMatch('foo', '*')).toBeTruthy();
        expect(isSimpleMatch('test', 'test/*')).toBeTruthy();
        expect(isSimpleMatch('test/foo', 'test/*')).toBeTruthy();
        expect(isSimpleMatch('test/', 'test/*')).toBeTruthy();
    });

    it('should not match with single glob', () => {
        expect(isSimpleMatch('test/foo/bar', 'test/*')).toBeFalsy();
    });

    it('should match with glob star', () => {
        expect(isSimpleMatch('test/foo', '**')).toBeTruthy();
        expect(isSimpleMatch('test', 'test/**')).toBeTruthy();
        expect(isSimpleMatch('test/foo/bar', 'test/**')).toBeTruthy();
        expect(isSimpleMatch('test/', 'test/**')).toBeTruthy();
    });

    it('should not match with glob star', () => {
        expect(isSimpleMatch('baz', 'test/**')).toBeFalsy();
    });

    it('should match single glob followed by a literal', () => {
        expect(isSimpleMatch('test/foo/bar', 'test/*/bar')).toBeTruthy();
        expect(isSimpleMatch('test//bar', 'test/*/bar')).toBeTruthy();
    });

    it('should not match single glob across a path separator', () => {
        expect(isSimpleMatch('test/foo/baz/bar', 'test/*/bar')).toBeFalsy();
        expect(isSimpleMatch('https://admin.example.com/a/b', 'https://*.example.com/*')).toBeFalsy();
    });

    it('should match host wildcard', () => {
        expect(isSimpleMatch('https://admin.example.com/cb', 'https://*.example.com/**')).toBeTruthy();
        expect(isSimpleMatch('https://admin.example.com', 'https://*.example.com/**')).toBeTruthy();
        expect(isSimpleMatch('https://a.b.example.com/cb', 'https://*.example.com/**')).toBeTruthy();
        expect(isSimpleMatch('https://admin.example.com', 'https://*.example.com')).toBeTruthy();
    });

    it('should not match host wildcard of another origin', () => {
        expect(isSimpleMatch('https://a.example.com', 'https://*.example.com.evil.test/**')).toBeFalsy();
        expect(isSimpleMatch('https://a.example.com.evil.test/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://a.example.com@evil.test/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://a.example.com:8080/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('http://a.example.com/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://example.com/cb', 'https://*.example.com/**')).toBeFalsy();
    });
});
