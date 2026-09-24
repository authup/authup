/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeHandlerMap, FakeRequest } from '@authup/core-http-kit/testing';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { ref } from 'vue';
import { createStore, createStoreDispatcher } from '../../../../src/core/store';

// The debounce the store applies before a change goes up.
const WRITE_DELAY = 300;

type AttributeRow = {
    id: string,
    name: string,
    value: string
};

type BuildOptions = {
    claims?: Record<string, string>,
    rows?: AttributeRow[],
    locale?: string,
    colorMode?: string,
    handlers?: FakeHandlerMap
};

function buildStore(options: BuildOptions = {}) {
    const locale = ref(options.locale ?? 'auto');
    const colorMode = ref(options.colorMode ?? 'system');
    const rows = options.rows ?? [];

    const httpClient = createFakeClient({
        handlers: {
            'POST /token/introspect': () => ({
                active: true,
                exp: 9999999999,
                sub: 'user-1',
                sub_kind: 'user',
                name: 'admin',
                realm_id: 'realm-1',
                realm_name: 'master',
                permissions: [],
                ...options.claims,
            }),
            'GET /user-attributes': (request) => {
                const filter = decodeURIComponent(request.url);
                const data = rows.filter((row) => filter.includes(`eq(name,'${row.name}')`));

                return { data, meta: { total: data.length } };
            },
            'POST /user-attributes': (request) => ({
                data: { id: 'attr-created', ...(request.body as Record<string, unknown>) },
                meta: {},
            }),
            'POST /user-attributes/:id': (request) => ({
                data: { id: request.params.id, ...(request.body as Record<string, unknown>) },
                meta: {},
            }),
            'DELETE /user-attributes/:id': (request) => ({
                data: { id: request.params.id },
                meta: {},
            }),
            'POST /token/revoke': () => ({}),
            ...options.handlers,
        },
    });

    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
        preferences: { locale, colorMode },
    });

    return {
        store,
        httpClient,
        locale,
        colorMode,
    };
}

function attributeRequests(httpClient: FakeClient) : FakeRequest[] {
    return httpClient.requests.filter(
        (request) => new URL(request.url, 'http://localhost').pathname.startsWith('/user-attributes'),
    );
}

describe('core/store/preferences', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('seeds both refs from the introspection claims without writing them back', async () => {
        const {
            store,
            httpClient,
            locale,
            colorMode,
        } = buildStore({ claims: { locale: 'de', color_mode: 'dark' } });

        store.accessToken.value = 'abc';
        await store.resolve();

        expect(locale.value).toEqual('de');
        expect(colorMode.value).toEqual('dark');

        // the seed assigns the refs, which fires their watchers: the
        // account's own value must not echo straight back up.
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(attributeRequests(httpClient)).toHaveLength(0);
    });

    it('writes an explicit browser value up once when the account holds none', async () => {
        const { store, httpClient } = buildStore({ locale: 'fr' });

        store.accessToken.value = 'abc';
        await store.resolve();
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        const requests = attributeRequests(httpClient);
        expect(requests).toHaveLength(2);
        expect(requests[0].method).toEqual('GET');
        expect(decodeURIComponent(requests[0].url)).toContain("eq(name,'locale')");
        expect(decodeURIComponent(requests[0].url)).toContain("eq(userId,'user-1')");
        expect(requests[1].method).toEqual('POST');
        expect(new URL(requests[1].url, 'http://localhost').pathname).toEqual('/user-attributes');
        expect(requests[1].body).toEqual({
            userId: 'user-1',
            name: 'locale',
            value: 'fr',
        });

        // a second commit that still reports no value does not write again
        store.applyTokenGrantResponse({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 3600,
        });
        await store.resolve();
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(attributeRequests(httpClient)).toHaveLength(2);
    });

    it('never writes the no-choice sentinel up', async () => {
        const { store, httpClient } = buildStore({ locale: 'auto', colorMode: 'system' });

        store.accessToken.value = 'abc';
        await store.resolve();
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(attributeRequests(httpClient)).toHaveLength(0);
    });

    it('updates the row a change has and creates the one it lacks', async () => {
        const {
            store,
            httpClient,
            locale,
            colorMode,
        } = buildStore({
            claims: { locale: 'de' },
            rows: [{
                id: 'attr-1',
                name: 'locale',
                value: 'de',
            }],
        });

        store.accessToken.value = 'abc';
        await store.resolve();

        locale.value = 'fr';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        let requests = attributeRequests(httpClient);
        expect(requests).toHaveLength(2);
        expect(requests[0].method).toEqual('GET');
        expect(requests[1].method).toEqual('POST');
        expect(new URL(requests[1].url, 'http://localhost').pathname).toEqual('/user-attributes/attr-1');
        expect(requests[1].body).toEqual({ value: 'fr' });

        // a rapid toggle is one write of what the ref holds at the end
        colorMode.value = 'dark';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY / 2);
        colorMode.value = 'light';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY / 2);
        colorMode.value = 'dark';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        requests = attributeRequests(httpClient).slice(2);
        expect(requests).toHaveLength(2);
        expect(requests[0].method).toEqual('GET');
        expect(decodeURIComponent(requests[0].url)).toContain("eq(name,'colorMode')");
        expect(requests[1].method).toEqual('POST');
        expect(new URL(requests[1].url, 'http://localhost').pathname).toEqual('/user-attributes');
        expect(requests[1].body).toEqual({
            userId: 'user-1',
            name: 'colorMode',
            value: 'dark',
        });
    });

    it('keeps a change in flight ahead of the value a commit still reports', async () => {
        const {
            store,
            httpClient,
            colorMode,
        } = buildStore({ claims: { color_mode: 'light' } });

        store.accessToken.value = 'abc';
        await store.resolve();
        expect(colorMode.value).toEqual('light');

        colorMode.value = 'dark';

        // `resolve()` shares an in-flight promise and clears it on a 0ms
        // timer, which the fake clock holds: one tick lets the next call run
        // rather than answer the settled one
        await vi.advanceTimersByTimeAsync(0);

        // a revalidation lands inside the debounce window, still carrying
        // the account's old value: it must not undo the toggle
        store.applyTokenGrantResponse({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 3600,
        });
        await store.resolve();
        expect(colorMode.value).toEqual('dark');

        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        const requests = attributeRequests(httpClient);
        expect(requests).toHaveLength(2);
        expect(requests[1].body).toEqual({
            userId: 'user-1',
            name: 'colorMode',
            value: 'dark',
        });
    });

    it('does nothing for a change while signed out', async () => {
        const {
            httpClient,
            locale,
            colorMode,
        } = buildStore();

        locale.value = 'fr';
        colorMode.value = 'dark';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(httpClient.requests).toHaveLength(0);
    });

    it('warns once on a failed write and throws nothing', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { store, locale } = buildStore({
            claims: { locale: 'de' },
            handlers: {
                'POST /user-attributes': () => {
                    throw new Error('boom');
                },
            },
        });

        store.accessToken.value = 'abc';
        await store.resolve();

        locale.value = 'fr';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('locale');
        expect(locale.value).toEqual('fr');
    });

    it('does not repeat a bootstrap the account refused on the next commit', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { store, httpClient } = buildStore({
            locale: 'fr',
            handlers: {
                'POST /user-attributes': () => {
                    throw new Error('forbidden');
                },
            },
        });

        store.accessToken.value = 'abc';
        await store.resolve();
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(attributeRequests(httpClient)).toHaveLength(2);
        expect(warn).toHaveBeenCalledTimes(1);

        // the cookie-mode consoles commit on every navigation: the same
        // doomed GET + POST pair must not fire again
        store.applyTokenGrantResponse({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 3600,
        });
        await store.resolve();
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(attributeRequests(httpClient)).toHaveLength(2);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('removes the account row when a preference goes back to its sentinel', async () => {
        let claims : Record<string, string> = { locale: 'de' };
        const {
            store,
            httpClient,
            locale,
        } = buildStore({
            rows: [{
                id: 'attr-1',
                name: 'locale',
                value: 'de',
            }],
            handlers: {
                'POST /token/introspect': () => ({
                    active: true,
                    exp: 9999999999,
                    sub: 'user-1',
                    sub_kind: 'user',
                    name: 'admin',
                    realm_id: 'realm-1',
                    realm_name: 'master',
                    permissions: [],
                    ...claims,
                }),
            },
        });

        store.accessToken.value = 'abc';
        await store.resolve();

        locale.value = 'auto';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        const requests = attributeRequests(httpClient);
        expect(requests).toHaveLength(2);
        expect(requests[0].method).toEqual('GET');
        expect(requests[1].method).toEqual('DELETE');
        expect(new URL(requests[1].url, 'http://localhost').pathname).toEqual('/user-attributes/attr-1');

        // the account now reports nothing, and a later commit leaves the
        // sentinel alone rather than bootstrapping it back up
        claims = {};
        store.applyTokenGrantResponse({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 3600,
        });
        await store.resolve();
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(attributeRequests(httpClient)).toHaveLength(2);
        expect(locale.value).toEqual('auto');
    });

    it('drops a pending change and seeds the new account when the subject changes', async () => {
        let sub = 'user-1';
        let claims : Record<string, string> = { color_mode: 'light' };
        const {
            store, 
            httpClient, 
            colorMode, 
        } = buildStore({
            handlers: {
                'POST /token/introspect': () => ({
                    active: true,
                    exp: 9999999999,
                    sub,
                    sub_kind: 'user',
                    name: sub,
                    realm_id: 'realm-1',
                    realm_name: 'master',
                    permissions: [],
                    ...claims,
                }),
            },
        });

        store.accessToken.value = 'abc';
        await store.resolve();
        expect(colorMode.value).toEqual('light');

        // user-1 toggles; before the debounce runs out, another tab has
        // signed the shared console session in as user-2 (the 0ms tick lets
        // the shared resolve() promise clear so the next call really runs)
        colorMode.value = 'dark';
        await vi.advanceTimersByTimeAsync(0);
        sub = 'user-2';
        claims = { color_mode: 'light' };
        store.applyTokenGrantResponse({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 3600,
        });
        await store.resolve();

        // user-2's own value is seeded rather than skipped behind user-1's
        // pending change, and that change is never written onto user-2
        expect(colorMode.value).toEqual('light');
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);
        expect(attributeRequests(httpClient)).toHaveLength(0);

        // a change user-2 makes goes up for user-2
        colorMode.value = 'dark';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        const requests = attributeRequests(httpClient);
        expect(requests).toHaveLength(2);
        expect(decodeURIComponent(requests[0].url)).toContain("eq(userId,'user-2')");
        expect(requests[1].body).toEqual({
            userId: 'user-2',
            name: 'colorMode',
            value: 'dark',
        });
    });

    it('keeps a write of the previous subject from touching the new one', async () => {
        let sub = 'user-1';
        let release : () => void = () => undefined;
        const {
            store, 
            httpClient, 
            locale, 
        } = buildStore({
            handlers: {
                'POST /token/introspect': () => ({
                    active: true,
                    exp: 9999999999,
                    sub,
                    sub_kind: 'user',
                    name: sub,
                    realm_id: 'realm-1',
                    realm_name: 'master',
                    permissions: [],
                    ...(sub === 'user-2' ? { locale: 'de' } : {}),
                }),
                'POST /user-attributes': (request) => new Promise((resolve) => {
                    release = () => resolve({
                        data: { id: 'attr-created', ...(request.body as Record<string, unknown>) },
                        meta: {},
                    });
                }),
            },
        });

        store.accessToken.value = 'abc';
        await store.resolve();

        // user-1's change is in flight (the POST has not answered yet)
        locale.value = 'fr';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);
        expect(attributeRequests(httpClient)).toHaveLength(2);

        sub = 'user-2';
        store.applyTokenGrantResponse({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 3600,
        });
        await store.resolve();

        // user-2's seed is not skipped behind user-1's in-flight write
        expect(locale.value).toEqual('de');

        // ... and its completion does not make 'fr' the value user-2 holds:
        // a change back to it is still written for user-2
        release();
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);
        expect(attributeRequests(httpClient)).toHaveLength(2);

        locale.value = 'fr';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        const requests = attributeRequests(httpClient).slice(2);
        expect(requests).toHaveLength(2);
        expect(decodeURIComponent(requests[0].url)).toContain("eq(userId,'user-2')");
    });
});
