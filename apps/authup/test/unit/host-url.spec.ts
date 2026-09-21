/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveHostURL } from '../../src/host/args.ts';
import { normalizeHostURL } from '../../src/host/url.ts';

describe('normalizeHostURL', () => {
    it('keeps the origin and the path prefix and drops a trailing slash', () => {
        expect(normalizeHostURL('https://auth.example.com/')).toEqual('https://auth.example.com');
        expect(normalizeHostURL('https://auth.example.com/auth/')).toEqual('https://auth.example.com/auth');
        expect(normalizeHostURL('http://localhost:3000')).toEqual('http://localhost:3000');
    });

    it.each([
        'https://alice:secret@auth.example.com',
        'https://auth.example.com/?x=1',
        'https://auth.example.com/#top',
    ])('refuses %s', (input) => {
        expect(() => normalizeHostURL(input)).toThrow(/user name, password, query or fragment/);
    });

    it('refuses plain http for a host that is not loopback', () => {
        expect(() => normalizeHostURL('http://auth.example.com')).toThrow(/Use https/);
        expect(normalizeHostURL('http://127.0.0.1:3000')).toEqual('http://127.0.0.1:3000');
        expect(normalizeHostURL('http://[::1]:3000')).toEqual('http://[::1]:3000');
    });

    it('refuses a value that is not a URL', () => {
        expect(() => normalizeHostURL('auth.example.com')).toThrow(/is not a URL/);
    });
});

describe('resolveHostURL', () => {
    it('prefers the flag, then the environment, then the current host', () => {
        expect(resolveHostURL('https://a.test', 'https://c.test', { AUTHUP_SERVER_URL: 'https://b.test' })).toEqual('https://a.test');
        expect(resolveHostURL(undefined, 'https://c.test', { AUTHUP_SERVER_URL: 'https://b.test' })).toEqual('https://b.test');
        expect(resolveHostURL(undefined, 'https://c.test', {})).toEqual('https://c.test');
    });

    it('refuses when nothing names a server', () => {
        expect(() => resolveHostURL(undefined, undefined, {})).toThrow(/No server given/);
    });
});
