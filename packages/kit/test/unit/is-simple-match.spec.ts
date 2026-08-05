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

    it('should treat a separator in front of a wildcard as optional', () => {
        expect(isSimpleMatch('test', 'test/*/**')).toBeTruthy();
        expect(isSimpleMatch('test', 'test*/**')).toBeTruthy();
        expect(isSimpleMatch('test', 'test/*bar')).toBeFalsy();
        expect(isSimpleMatch('test', 'test//**')).toBeFalsy();
    });

    it('should not match an unrelated origin carrying no path', () => {
        // the wildcard used to swallow the rest of a value that held no
        // further separator, so every path-less URI matched every pattern
        // whose literal prefix it shared
        expect(isSimpleMatch('https://attacker.test', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://attacker.test?code=1', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://attacker.test', 'https://app.example.com/*')).toBeFalsy();
    });

    it('should not match host wildcard of another origin', () => {
        expect(isSimpleMatch('https://a.example.com', 'https://*.example.com.evil.test/**')).toBeFalsy();
        expect(isSimpleMatch('https://a.example.com.evil.test/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://a.example.com@evil.test/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://a.example.com:8080/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('http://a.example.com/cb', 'https://*.example.com/**')).toBeFalsy();
        expect(isSimpleMatch('https://example.com/cb', 'https://*.example.com/**')).toBeFalsy();
    });

    it('should agree with the reference matcher on every short value/pattern pair', () => {
        // isSimpleMatch walks both sides on separate indices and backtracks
        // into the last wildcard, which is a lot easier to get subtly wrong
        // than to review. The reference below is the same contract written
        // as a plain recursive search: exponential, but obviously correct.
        // Both are exercised over every string of length <= 4 built from the
        // alphabet below, so a regression on either side shows up as a
        // disagreement rather than as an untested corner.
        const reference = (value: string, pattern: string) : boolean => {
            const match = (valueIndex: number, patternIndex: number) : boolean => {
                if (patternIndex >= pattern.length) {
                    return valueIndex >= value.length;
                }

                if (pattern[patternIndex] === '*' && pattern[patternIndex + 1] === '*') {
                    return true;
                }

                if (pattern[patternIndex] === '*') {
                    for (let i = valueIndex; ; i++) {
                        if (match(i, patternIndex + 1)) {
                            return true;
                        }

                        if (i >= value.length || value[i] === '/') {
                            return false;
                        }
                    }
                }

                if (
                    valueIndex >= value.length &&
                    pattern[patternIndex] === '/' &&
                    pattern[patternIndex + 1] === '*'
                ) {
                    return match(valueIndex, patternIndex + 1);
                }

                if (valueIndex < value.length && pattern[patternIndex] === value[valueIndex]) {
                    return match(valueIndex + 1, patternIndex + 1);
                }

                return false;
            };

            return match(0, 0);
        };

        const alphabet = ['a', 'b', '/', '*'];
        const corpus: string[] = [];
        const build = (prefix: string, depth: number) => {
            corpus.push(prefix);
            if (depth === 0) {
                return;
            }

            for (const character of alphabet) {
                build(prefix + character, depth - 1);
            }
        };
        build('', 4);

        const divergences: string[] = [];
        for (const value of corpus) {
            for (const pattern of corpus) {
                if (isSimpleMatch(value, pattern) !== reference(value, pattern)) {
                    divergences.push(`${JSON.stringify(value)} ~ ${JSON.stringify(pattern)}`);
                }
            }
        }

        expect(divergences).toEqual([]);
    });
});
