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

        store.setAccessToken('abc');
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

        store.setAccessToken('abc');
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

        store.setAccessToken('abc');
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

        store.setAccessToken('abc');
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

        store.setAccessToken('abc');
        await store.resolve();
        expect(colorMode.value).toEqual('light');

        colorMode.value = 'dark';

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

        store.setAccessToken('abc');
        await store.resolve();

        locale.value = 'fr';
        await vi.advanceTimersByTimeAsync(WRITE_DELAY);

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('locale');
        expect(locale.value).toEqual('fr');
    });
});
