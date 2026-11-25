/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, CookieName } from '@authup/core-http-kit';
import type { ClientOptions } from '@authup/core-http-kit';
import type { TransportRequest } from 'hapic';
import { createPinia } from 'pinia';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { createApp, h } from 'vue';
import { injectHTTPClientAuthenticationHook, installHTTPClientAuthenticationHook } from '../../../../src/core/http-client/index.ts';
import { injectStore, installStore } from '../../../../src/core/store/index.ts';

type Transport = NonNullable<ClientOptions['transport']>;

type LockManagerStub = {
    request: <T>(name: string, fn: () => Promise<T>) => Promise<T>
};

function readForm(request: TransportRequest) : URLSearchParams {
    const { body } = request;

    if (body instanceof URLSearchParams) {
        return body;
    }

    return new URLSearchParams(typeof body === 'string' ? body : '');
}

/**
 * One authorization server shared by every tab: it rotates refresh tokens
 * and refuses a consumed one, the way strict replay detection does.
 */
function createServer() {
    const consumed = new Set<string>();
    const revoked : string[] = [];
    const requests : TransportRequest[] = [];
    let counter = 1;

    let gate : Promise<void> | undefined;

    const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });

    const transport : Transport = {
        dispatch: async (request) => {
            requests.push(request);

            const { pathname } = new URL(request.url);
            const body = readForm(request);

            if (pathname === '/token/revoke') {
                revoked.push(body.get('token') || '');

                return respond(200, {});
            }

            if (pathname === '/token/introspect') {
                return respond(200, {
                    active: true,
                    exp: 9999999999,
                    sub: 'user-1',
                    sub_kind: 'user',
                    name: 'admin',
                    realm_id: 'realm-1',
                    realm_name: 'master',
                    permissions: [],
                });
            }

            if (pathname === '/token') {
                if (gate) {
                    await gate;
                }

                const presented = body.get('refresh_token') || '';

                if (consumed.has(presented)) {
                    return respond(400, { error: 'invalid_grant', message: 'The refresh token was replayed.' });
                }

                consumed.add(presented);
                counter++;

                return respond(200, {
                    access_token: `at-${counter}`,
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: `rt-${counter}`,
                });
            }

            return respond(200, {});
        },
    };

    return {
        transport,
        requests,
        revoked,
        tokenRequests: () => requests.filter((request) => new URL(request.url).pathname === '/token'),
        hold: () => {
            const { promise, resolve } = Promise.withResolvers<void>();

            gate = promise;

            return () => {
                gate = undefined;
                resolve();
            };
        },
    };
}

type Server = ReturnType<typeof createServer>;

function createJar(seed: Record<string, string> = {}) {
    return new Map<string, string>(Object.entries(seed));
}

function buildTab(server: Server, jar: Map<string, string>, options: { hook?: boolean } = {}) {
    const createClient = () => new Client({ baseURL: 'http://fake.test/', transport: server.transport });

    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });

    app.use(pinia);

    installStore(app, {
        httpClient: createClient,
        pinia,
        cookieGet: (key) => jar.get(key),
        cookieSet: (key, value) => {
            if (value === null || typeof value === 'undefined') {
                jar.delete(key);

                return;
            }

            jar.set(key, value instanceof Date ? value.toISOString() : String(value));
        },
        cookieUnset: (key) => {
            jar.delete(key);
        },
    });

    if (options.hook) {
        installHTTPClientAuthenticationHook(app, {
            httpClient: createClient,
            pinia,
            isServer: false,
        });
    }

    const store = injectStore(pinia, app);

    return {
        store,
        hook: () => injectHTTPClientAuthenticationHook(app),
    };
}

/**
 * Serializes holders per name, like the Web Locks API, and records the
 * refresh-token cookie each holder leaves behind when it releases.
 */
function createLocks(jar: Map<string, string>) {
    const chains = new Map<string, Promise<unknown>>();
    const released : (string | undefined)[] = [];

    const locks : LockManagerStub = {
        request: <T>(name: string, fn: () => Promise<T>) => {
            const previous = chains.get(name) || Promise.resolve();
            const run = previous.then(async () => {
                try {
                    return await fn();
                } finally {
                    released.push(jar.get(CookieName.REFRESH_TOKEN));
                }
            });

            chains.set(name, run.catch(() => undefined));

            return run;
        },
    };

    return { locks, released };
}

function setLocks(locks: LockManagerStub | undefined) {
    Object.defineProperty(navigator, 'locks', {
        value: locks,
        configurable: true,
        writable: true,
    });
}

const EXPIRED_SEED = { [CookieName.REFRESH_TOKEN]: 'rt-1' };

describe('core/store (refresh across tabs)', () => {
    let original : unknown;

    beforeEach(() => {
        original = (navigator as { locks?: unknown }).locks;
    });

    afterEach(() => {
        setLocks(original as LockManagerStub | undefined);
    });

    it('refreshes once when two tabs restore the same session', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);

        setLocks(createLocks(jar).locks);

        const a = buildTab(server, jar);
        const b = buildTab(server, jar);

        await Promise.all([a.store.resolve(), b.store.resolve()]);

        expect(server.tokenRequests()).toHaveLength(1);
        expect(a.store.refreshToken).toEqual('rt-2');
        expect(b.store.refreshToken).toEqual('rt-2');
        expect(b.store.accessToken).toEqual('at-2');
        expect(jar.get(CookieName.REFRESH_TOKEN)).toEqual('rt-2');
    });

    it('writes the rotated token before releasing the lock', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);
        const { locks, released } = createLocks(jar);

        setLocks(locks);

        const a = buildTab(server, jar);

        await a.store.resolve();

        expect(released[0]).toEqual('rt-2');
    });

    it('adopts another tab\'s refresh from the authentication hook without revoking it', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);

        setLocks(createLocks(jar).locks);

        const a = buildTab(server, jar);
        const b = buildTab(server, jar, { hook: true });

        await Promise.all([a.store.resolve(), b.hook().refresh()]);

        expect(server.tokenRequests()).toHaveLength(1);
        expect(server.revoked).toEqual([]);
        expect(b.store.refreshToken).toEqual('rt-2');
        expect(b.store.accessToken).toEqual('at-2');
    });

    it('keeps a logout during the exchange final and revokes the exchanged pair', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);

        setLocks(createLocks(jar).locks);

        const a = buildTab(server, jar);
        const release = server.hold();

        const pending = a.store.resolve();

        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
        await a.store.logout();
        release();

        await expect(pending).rejects.toThrow();

        expect(a.store.refreshToken).toBeNull();
        expect(server.revoked).toContain('rt-2');
    });

    it('refreshes unlocked when the lock api is missing', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);

        setLocks(undefined);

        const a = buildTab(server, jar);

        await a.store.resolve();

        expect(server.tokenRequests()).toHaveLength(1);
        expect(a.store.refreshToken).toEqual('rt-2');
    });

    it('exchanges when the cookie still holds the presented token', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);

        setLocks(createLocks(jar).locks);

        const a = buildTab(server, jar);

        await a.store.resolve();

        const b = buildTab(server, jar);

        await b.store.resolve();

        expect(server.tokenRequests()).toHaveLength(1);
        expect(b.store.refreshToken).toEqual('rt-2');
    });
});
