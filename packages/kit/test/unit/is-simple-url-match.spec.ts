/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isSimpleMatch, isSimpleURLMatch, patternHasGlobstarInAuthority } from '../../src';

describe('is-simple-url-match', () => {
    // isSimpleMatch knows exactly one boundary, `/`, but a URL authority also
    // ends at `?`, `#` and `\`. Matched against the raw string, a `*` in the
    // host absorbs one of those and the pattern's remaining host literal ends
    // up in the query or fragment of a foreign origin, so the authorization
    // code is delivered to the attacker. Each of these matched before the
    // value was canonicalized.
    it('should not let a host wildcard absorb an authority terminator', () => {
        const pattern = 'https://*.example.com/**';

        expect(isSimpleURLMatch('https://evil.test?.example.com/cb', pattern)).toBeFalsy();
        expect(isSimpleURLMatch('https://evil.test#.example.com/cb', pattern)).toBeFalsy();
        expect(isSimpleURLMatch('https://evil.test\\.example.com/cb', pattern)).toBeFalsy();
        expect(isSimpleURLMatch('https://user@evil.test#.example.com/cb', pattern)).toBeFalsy();
        expect(isSimpleURLMatch('https://evil.test:8443#.example.com/cb', pattern)).toBeFalsy();

        // the raw matcher is what these get past, which is why the consumers
        // must not call it directly on a URL
        expect(isSimpleMatch('https://evil.test?.example.com/cb', pattern)).toBeTruthy();
    });

    it('should not match a foreign origin', () => {
        expect(isSimpleURLMatch('https://a.example.com.evil.test/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleURLMatch('https://a.example.com@evil.test/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleURLMatch('https://evil.test', 'https://app.example.com/**')).toBeFalsy();
        expect(isSimpleURLMatch('http://app.example.com/cb', 'https://app.example.com/**')).toBeFalsy();
    });

    // The authorized string has to be the string the browser navigates to, or
    // a path-scoped pattern can be walked out of via dot segments.
    it('should resolve dot segments before matching', () => {
        expect(isSimpleURLMatch(
            'https://app.example.com/tenant-a/../tenant-b/cb',
            'https://app.example.com/tenant-a/**',
        )).toBeFalsy();

        expect(isSimpleURLMatch(
            'https://app.example.com/tenant-a/./cb',
            'https://app.example.com/tenant-a/**',
        )).toBeTruthy();
    });

    it('should match a legitimate redirect', () => {
        expect(isSimpleURLMatch('https://app.example.com/cb', 'https://app.example.com/**')).toBeTruthy();
        expect(isSimpleURLMatch('https://app.example.com/a/b/c', 'https://app.example.com/**')).toBeTruthy();
        expect(isSimpleURLMatch('https://app.example.com/cb', 'https://app.example.com/*')).toBeTruthy();
        expect(isSimpleURLMatch('https://app.example.com/cb', 'https://app.example.com/cb')).toBeTruthy();
        expect(isSimpleURLMatch('http://localhost:3000/login/callback', 'http://localhost:3000/**')).toBeTruthy();
    });

    // A bare origin serializes with the root path, so a pattern registered
    // without the trailing slash would stop matching if the canonical form
    // were the only candidate.
    it('should match a bare origin against a pattern carrying no trailing slash', () => {
        expect(isSimpleURLMatch('https://app.example.com', 'https://app.example.com')).toBeTruthy();
        expect(isSimpleURLMatch('https://app.example.com/', 'https://app.example.com')).toBeTruthy();
        expect(isSimpleURLMatch('https://app.example.com', 'https://app.example.com/**')).toBeTruthy();
        expect(isSimpleURLMatch('https://app.example.com', 'https://app.example.com/*')).toBeTruthy();
    });

    it('should keep supporting a host wildcard', () => {
        const pattern = 'https://*.example.com/**';

        expect(isSimpleURLMatch('https://a.example.com/cb', pattern)).toBeTruthy();
        expect(isSimpleURLMatch('https://a.b.example.com/cb', pattern)).toBeTruthy();
        expect(isSimpleURLMatch('https://a.example.com', pattern)).toBeTruthy();
    });

    // Canonicalization is what makes these equivalent, and they are: the
    // browser navigates to the same origin either way.
    it('should normalize host case, the default port and userinfo', () => {
        expect(isSimpleURLMatch('https://APP.example.com/cb', 'https://app.example.com/**')).toBeTruthy();
        expect(isSimpleURLMatch('https://app.example.com:443/cb', 'https://app.example.com/**')).toBeTruthy();
        expect(isSimpleURLMatch('http://app.example.com:80/cb', 'http://app.example.com/**')).toBeTruthy();
    });

    it('should match a custom scheme verbatim', () => {
        expect(isSimpleURLMatch('myapp://callback', 'myapp://callback')).toBeTruthy();
        expect(isSimpleURLMatch('myapp://callback/x', 'myapp://callback/**')).toBeTruthy();
        expect(isSimpleURLMatch('myapp://other', 'myapp://callback')).toBeFalsy();
    });

    it('should reject a value that is not a URL', () => {
        expect(isSimpleURLMatch('/relative/path', 'https://app.example.com/**')).toBeFalsy();
        expect(isSimpleURLMatch('//evil.test', 'https://app.example.com/**')).toBeFalsy();
        expect(isSimpleURLMatch('', 'https://app.example.com/**')).toBeFalsy();
        expect(isSimpleURLMatch('not a url', '**')).toBeFalsy();
    });

    it('should accept a list of patterns', () => {
        const patterns = ['https://a.example.com/**', 'https://b.example.com/**'];

        expect(isSimpleURLMatch('https://b.example.com/cb', patterns)).toBeTruthy();
        expect(isSimpleURLMatch('https://c.example.com/cb', patterns)).toBeFalsy();
        expect(isSimpleURLMatch('https://a.example.com/cb', [])).toBeFalsy();
    });

    // Every pair a wildcard-free pattern accepted before must still be
    // accepted: those are the overwhelming majority of configured patterns,
    // and this change must not log anyone out of a working deployment.
    it('should not narrow what a wildcard-free pattern accepts', () => {
        const hosts = ['app.example.com', 'localhost:3000', 'a.b.example.com'];
        const patternPaths = ['/**', '/*', '/cb', ''];
        const valuePaths = ['', '/', '/cb', '/auth/callback', '/a/b/c', '/cb?x=1', '/cb#f'];

        const regressions: string[] = [];
        for (const host of hosts) {
            for (const patternPath of patternPaths) {
                const pattern = `https://${host}${patternPath}`;
                for (const valuePath of valuePaths) {
                    const value = `https://${host}${valuePath}`;
                    if (isSimpleMatch(value, pattern) && !isSimpleURLMatch(value, pattern)) {
                        regressions.push(`${value} ~ ${pattern}`);
                    }
                }
            }
        }

        expect(regressions).toEqual([]);
    });

    describe('patternHasGlobstarInAuthority', () => {
        // `**` matches the rest of the value outright, discarding whatever the
        // pattern says after it, so a `**` in the authority accepts every
        // origin. There is no safe reading of it.
        it('should detect a globstar in the authority', () => {
            expect(patternHasGlobstarInAuthority('https://**.example.com/**')).toBeTruthy();
            expect(patternHasGlobstarInAuthority('https://**')).toBeTruthy();
            expect(patternHasGlobstarInAuthority('**')).toBeTruthy();
            expect(patternHasGlobstarInAuthority('https://**:3000/cb')).toBeTruthy();
        });

        it('should allow a single wildcard and a globstar in the path', () => {
            expect(patternHasGlobstarInAuthority('https://*.example.com/**')).toBeFalsy();
            expect(patternHasGlobstarInAuthority('https://app.example.com/**')).toBeFalsy();
            expect(patternHasGlobstarInAuthority('https://app.example.com/**/cb')).toBeFalsy();
            expect(patternHasGlobstarInAuthority('http://localhost:3000/**')).toBeFalsy();
            expect(patternHasGlobstarInAuthority('myapp://cb/**')).toBeFalsy();
        });
    });
});
