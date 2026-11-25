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
    vi,
} from 'vitest';
import { createApp, h } from 'vue';
import { injectHTTPClientAuthenticationHook, installHTTPClientAuthenticationHook } from '../../../../src/core/http-client/index.ts';
import { REFRESH_LOCK_WAIT_MS } from '../../../../src/core/store/refresh-lock.ts';
import {
    StoreDispatcherEventName,
    injectStore,
    injectStoreDispatcher,
    installStore,
} from '../../../../src/core/store/index.ts';

type Transport = NonNullable<ClientOptions['transport']>;

type LockManagerStub = {
    request: <T>(name: string, options: { signal?: AbortSignal }, fn: () => Promise<T>) => Promise<T>
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
    let unauthorized = false;
    let introspectionRefused = false;

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

            if (pathname === '/token/introspect' && introspectionRefused) {
                return respond(400, { message: 'The introspection failed.' });
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

                if (unauthorized) {
                    return respond(401, { message: 'Unauthorized.' });
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
        refuseTokens: () => {
            unauthorized = true;
        },
        refuseIntrospection: () => {
            introspectionRefused = true;
        },
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

type TabOptions = {
    hook?: boolean,
    /**
     * One client instance shared by the store and the hook, with the hook
     * attached to it, as a host passing `httpClient` as an instance gets.
     */
    sharedClient?: boolean
};

function buildTab(server: Server, jar: Map<string, string>, options: TabOptions = {}) {
    const shared = options.sharedClient ?
        new Client({ baseURL: 'http://fake.test/', transport: server.transport }) :
        undefined;
    const createClient = () => shared || new Client({ baseURL: 'http://fake.test/', transport: server.transport });

    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });

    app.use(pinia);

    installStore(app, {
        httpClient: shared || createClient,
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
            httpClient: shared || createClient,
            pinia,
            isServer: false,
        });

        if (shared) {
            injectHTTPClientAuthenticationHook(app).attach(shared);
        }
    }

    const store = injectStore(pinia, app);
    const dispatcher = injectStoreDispatcher(app);

    return {
        store,
        dispatcher,
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
        request: <T>(name: string, options: { signal?: AbortSignal }, fn: () => Promise<T>) => {
            const previous = chains.get(name) || Promise.resolve();

            // A request aborted before it is granted rejects and never runs,
            // and the queue moves on without it.
            const aborted = new Promise<never>((_resolve, reject) => {
                options.signal?.addEventListener('abort', () => {
                    reject(new DOMException('The lock request was aborted.', 'AbortError'));
                });
            });

            const granted = Promise.race([previous.then(() => true), aborted]);

            const run = granted.then(async () => {
                try {
                    return await fn();
                } finally {
                    released.push(jar.get(CookieName.REFRESH_TOKEN));
                }
            });

            // The next request waits for this one to finish, or, when this
            // one was aborted, for whatever it was waiting on.
            chains.set(name, granted.then(() => run.catch(() => undefined), () => previous));

            return run;
        },
    };

    // Hold the lock from outside, as another tab mid-refresh does.
    const occupy = () => {
        const { promise, resolve } = Promise.withResolvers<void>();

        locks.request(`authup:${CookieName.REFRESH_TOKEN}`, {}, () => promise);

        return resolve;
    };

    return {
        locks, 
        released, 
        occupy, 
    };
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

    it('presents the cookie\'s token when a tab slept through another tab\'s rotation', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);

        setLocks(createLocks(jar).locks);

        const sleeper = buildTab(server, jar);
        const active = buildTab(server, jar);

        await active.store.resolve();

        // the access token lapsed by its maxAge while the sleeper was frozen
        jar.delete(CookieName.ACCESS_TOKEN);
        jar.delete(CookieName.ACCESS_TOKEN_EXPIRE_DATE);

        await sleeper.store.resolve();

        expect(server.tokenRequests()).toHaveLength(2);
        expect(sleeper.store.refreshToken).toEqual('rt-3');
        expect(jar.get(CookieName.REFRESH_TOKEN)).toEqual('rt-3');
    });

    it('presents nothing when a logout lands while waiting for the lock', async () => {
        const server = createServer();
        const jar = createJar(EXPIRED_SEED);
        const { locks, occupy } = createLocks(jar);

        setLocks(locks);

        const tab = buildTab(server, jar, { hook: true });

        let expired = 0;

        tab.dispatcher.on(StoreDispatcherEventName.SESSION_EXPIRED, () => {
            expired++;
        });

        const release = occupy();
        const pending = tab.hook().refresh().catch(() => undefined);

        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
        await tab.store.logout();
        release();
        await pending;
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        expect(server.tokenRequests()).toHaveLength(0);
        expect(expired).toEqual(0);
        expect(tab.store.refreshToken).toBeNull();
    });

    it('does not wait on its own lock when the refresh is refused with a plain 401', async () => {
        const server = createServer();
        // A held access token enables the hook on the shared client, and a
        // failed revalidation makes the store refresh through that client.
        const jar = createJar({
            ...EXPIRED_SEED,
            [CookieName.ACCESS_TOKEN]: 'at-1',
            [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: new Date(Date.now() + 3600 * 1000).toISOString(),
        });

        setLocks(createLocks(jar).locks);

        const tab = buildTab(server, jar, { hook: true, sharedClient: true });

        server.refuseIntrospection();
        server.refuseTokens();

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        try {
            const pending = expect(tab.store.resolve()).rejects.toThrow();

            await vi.advanceTimersByTimeAsync(REFRESH_LOCK_WAIT_MS);
            await pending;
        } finally {
            vi.useRealTimers();
        }
    });
});
