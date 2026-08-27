/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveAccountConsoleRef } from '../../src/ref';

const TRUSTED = ['https://admin.example.com', 'http://localhost:3000'];

describe('resolveAccountConsoleRef', () => {
    it('should accept a trusted origin and canonicalize it', () => {
        expect(resolveAccountConsoleRef('https://admin.example.com', TRUSTED))
            .toEqual('https://admin.example.com/');
    });

    it('should accept any path under a trusted origin', () => {
        expect(resolveAccountConsoleRef('https://admin.example.com/users/1?x=2#f', TRUSTED))
            .toEqual('https://admin.example.com/users/1?x=2#f');
        expect(resolveAccountConsoleRef('http://localhost:3000/a/b/c', TRUSTED))
            .toEqual('http://localhost:3000/a/b/c');
    });

    it('should lowercase the host before matching', () => {
        expect(resolveAccountConsoleRef('https://ADMIN.example.com/', TRUSTED))
            .toEqual('https://admin.example.com/');
    });

    it('should trim surrounding whitespace', () => {
        expect(resolveAccountConsoleRef('  https://admin.example.com/p  ', TRUSTED))
            .toEqual('https://admin.example.com/p');
    });

    it('should reject a foreign origin', () => {
        expect(resolveAccountConsoleRef('https://evil.test/x', TRUSTED)).toBeUndefined();
    });

    it('should reject a userinfo-prefixed host', () => {
        expect(resolveAccountConsoleRef('https://admin.example.com@evil.test/x', TRUSTED))
            .toBeUndefined();
    });

    it('should reject a suffix-extended host', () => {
        expect(resolveAccountConsoleRef('https://admin.example.com.evil.test/', TRUSTED))
            .toBeUndefined();
        expect(resolveAccountConsoleRef('https://admin.example.comevil.test/', TRUSTED))
            .toBeUndefined();
    });

    it('should reject a scheme downgrade', () => {
        expect(resolveAccountConsoleRef('http://admin.example.com/', TRUSTED)).toBeUndefined();
    });

    it('should reject a non-http(s) protocol', () => {
        // eslint-disable-next-line no-script-url -- exercising the protocol guard
        expect(resolveAccountConsoleRef('javascript:alert(1)', TRUSTED)).toBeUndefined();
    });

    it('should reject an unparseable value', () => {
        expect(resolveAccountConsoleRef('not-a-url', TRUSTED)).toBeUndefined();
        expect(resolveAccountConsoleRef('', TRUSTED)).toBeUndefined();
        expect(resolveAccountConsoleRef(undefined, TRUSTED)).toBeUndefined();
        expect(resolveAccountConsoleRef(['a'], TRUSTED)).toBeUndefined();
    });

    it('should reject an over-long value', () => {
        const long = `https://admin.example.com/${'a'.repeat(3000)}`;
        expect(resolveAccountConsoleRef(long, TRUSTED)).toBeUndefined();
    });

    it('should reject everything when no origin is trusted', () => {
        expect(resolveAccountConsoleRef('https://admin.example.com/', [])).toBeUndefined();
    });
});
