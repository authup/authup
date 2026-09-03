/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { resolveConfig as resolveAuthConsoleConfig } from '@authup/server-auth-console';
import { applyInternalApiUrl, buildInternalUrl } from '../../src/console/api-url';
import type { ConsoleConfigs } from '../../src/console/types';

/**
 * The regression behind #3550: the auth console is the one console that
 * fetches server-side, and it did so against `publicUrl`, which is where a
 * BROWSER reaches the deployment. Published as `-p 3001:3000` the two
 * diverge, nothing listens on 3001 inside the container, and every hosted
 * auth page answered 502 while the API and the two static consoles worked.
 */
describe('buildInternalUrl', () => {
    it('should dial the loopback address for a wildcard listener', () => {
        // the container default, and the case that produced the 502
        for (const host of ['0.0.0.0', '::', '[::]', '']) {
            expect(buildInternalUrl(host, 3000)).toEqual('http://127.0.0.1:3000');
        }
    });

    it('should dial the listen host itself when it names one interface', () => {
        // 127.0.0.1 is not bound in that case, so looping back unconditionally
        // would trade one unreachable address for another
        expect(buildInternalUrl('10.0.0.5', 3000)).toEqual('http://10.0.0.5:3000');
    });

    it('should bracket an IPv6 literal, or the url does not parse at all', () => {
        // a dual-stack deployment may bind one address rather than the
        // wildcard, and an unbracketed `http://::1:3000` is not a URL, so the
        // render would fail where it used to reach publicUrl
        expect(buildInternalUrl('::1', 3000)).toEqual('http://[::1]:3000');
        expect(new URL(buildInternalUrl('::1', 3000)).port).toEqual('3000');

        // already bracketed stays as it is
        expect(buildInternalUrl('[::1]', 3000)).toEqual('http://[::1]:3000');
    });

    it('should carry the listen port, never the port a container publishes', () => {
        expect(buildInternalUrl('0.0.0.0', 3000)).toEqual('http://127.0.0.1:3000');
    });

    it('should carry no path, because server-core mounts every route root-relative', () => {
        // a sub-path deployment's prefix is stripped by the proxy before a
        // request arrives, so a self-call must not re-add it
        expect(new URL(buildInternalUrl('0.0.0.0', 3000)).pathname).toEqual('/');
    });
});

describe('applyInternalApiUrl', () => {
    function consoles(input: Record<string, any> = {}) : ConsoleConfigs {
        return { auth: resolveAuthConsoleConfig({ publicUrl: 'https://idp.example.com', ...input }) } as ConsoleConfigs;
    }

    it('should point the auth console at this process own listener', () => {
        const value = consoles();

        applyInternalApiUrl(value, {
            publicUrl: 'https://idp.example.com',
            internalUrl: 'https://idp.example.com',
            host: '0.0.0.0',
            port: 3000,
        });

        expect(value.auth.apiInternalUrl).toEqual('http://127.0.0.1:3000');
        // the browser's address is untouched: it is the issuer, the cookie
        // scope and the baseURL the rendered page carries
        expect(value.auth.apiUrl).toEqual('https://idp.example.com');
    });

    it('should keep a configured internalUrl, because the operator named the network', () => {
        // the kubernetes case: the API is reached at a cluster service name,
        // and a composed process may still be told to use one
        const value = consoles({ internalUrl: 'http://authup.authup.svc:3000' });

        applyInternalApiUrl(value, {
            publicUrl: 'https://idp.example.com',
            internalUrl: 'http://authup.authup.svc:3000',
            host: '0.0.0.0',
            port: 3000,
        });

        expect(value.auth.apiInternalUrl).toEqual('http://authup.authup.svc:3000');
    });

    it('should still take the listener when an explicit internalUrl equals publicUrl', () => {
        // deliberate, not an approximation of provenance: a value spelled out
        // to equal the public one names no inside address, and honouring it
        // would send this process through its own ingress and TLS to reach
        // itself -- the configuration #3550 reported. A deployment that wants
        // the long way round runs the console as its own service, where
        // nothing is overridden.
        const value = consoles({ internalUrl: 'https://idp.example.com' });

        applyInternalApiUrl(value, {
            publicUrl: 'https://idp.example.com',
            internalUrl: 'https://idp.example.com',
            host: '0.0.0.0',
            port: 3000,
        });

        expect(value.auth.apiInternalUrl).toEqual('http://127.0.0.1:3000');
    });

    it('should keep a configured internalUrl that only differs by path', () => {
        // a path is allowed and means what it means on publicUrl: an internal
        // proxy that strips a prefix. Only the DERIVED address is necessarily
        // path-less, because it goes straight to the listener.
        const value = consoles({ internalUrl: 'https://idp.example.com/auth' });

        applyInternalApiUrl(value, {
            publicUrl: 'https://idp.example.com',
            internalUrl: 'https://idp.example.com/auth',
            host: '0.0.0.0',
            port: 3000,
        });

        expect(value.auth.apiInternalUrl).toEqual('https://idp.example.com/auth');
    });
});
