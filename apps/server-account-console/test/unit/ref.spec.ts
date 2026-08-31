/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveRef } from '../../src/ref';

const TRUSTED = ['https://admin.example.com', 'http://localhost:3000'];

describe('resolveRef', () => {
    it('should accept a trusted origin and canonicalize it', () => {
        expect(resolveRef('https://admin.example.com', TRUSTED))
            .toEqual('https://admin.example.com/');
    });

    it('should accept any path under a trusted origin', () => {
        expect(resolveRef('https://admin.example.com/users/1?x=2#f', TRUSTED))
            .toEqual('https://admin.example.com/users/1?x=2#f');
        expect(resolveRef('http://localhost:3000/a/b/c', TRUSTED))
            .toEqual('http://localhost:3000/a/b/c');
    });

    it('should lowercase the host before matching', () => {
        expect(resolveRef('https://ADMIN.example.com/', TRUSTED))
            .toEqual('https://admin.example.com/');
    });

    it('should trim surrounding whitespace', () => {
        expect(resolveRef('  https://admin.example.com/p  ', TRUSTED))
            .toEqual('https://admin.example.com/p');
    });

    it('should reject a foreign origin', () => {
        expect(resolveRef('https://evil.test/x', TRUSTED)).toBeUndefined();
    });

    it('should reject a userinfo-prefixed host', () => {
        expect(resolveRef('https://admin.example.com@evil.test/x', TRUSTED))
            .toBeUndefined();
    });

    it('should reject a suffix-extended host', () => {
        expect(resolveRef('https://admin.example.com.evil.test/', TRUSTED))
            .toBeUndefined();
        expect(resolveRef('https://admin.example.comevil.test/', TRUSTED))
            .toBeUndefined();
    });

    it('should reject a scheme downgrade', () => {
        expect(resolveRef('http://admin.example.com/', TRUSTED)).toBeUndefined();
    });

    it('should reject a non-http(s) protocol', () => {
        // eslint-disable-next-line no-script-url -- exercising the protocol guard
        expect(resolveRef('javascript:alert(1)', TRUSTED)).toBeUndefined();
    });

    it('should reject an unparseable value', () => {
        expect(resolveRef('not-a-url', TRUSTED)).toBeUndefined();
        expect(resolveRef('', TRUSTED)).toBeUndefined();
        expect(resolveRef(undefined, TRUSTED)).toBeUndefined();
        expect(resolveRef(['a'], TRUSTED)).toBeUndefined();
    });

    it('should reject an over-long value', () => {
        const long = `https://admin.example.com/${'a'.repeat(3000)}`;
        expect(resolveRef(long, TRUSTED)).toBeUndefined();
    });

    it('should reject everything when no origin is trusted', () => {
        expect(resolveRef('https://admin.example.com/', [])).toBeUndefined();
    });
});
