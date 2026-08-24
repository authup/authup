/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

// The routup middlewares parse the request into these globally-registered
// store slots. Seeding them directly lets a fabricated event exercise the
// request helpers without the full HTTP dispatch chain.
const COOKIE_SYMBOL = Symbol.for('@routup/cookie:ReqCookie');
const QUERY_SYMBOL = Symbol.for('@routup/query:ReqQuery');
const BODY_SYMBOL = Symbol.for('@routup/body:ReqBody');

export type FakeEventInit = {
    path?: string,
    method?: string,
    params?: Record<string, string | undefined>,
    headers?: Record<string, string>,
    cookies?: Record<string, string>,
    query?: Record<string, any>,
    body?: Record<string, any>,
    store?: Record<string | symbol, unknown>,
};

export function createFakeEvent(init: FakeEventInit = {}): IAppEvent {
    const store: Record<string | symbol, unknown> = { ...(init.store || {}) };

    if (init.cookies) {
        store[COOKIE_SYMBOL] = { ...init.cookies };
    }
    if (init.query) {
        store[QUERY_SYMBOL] = { ...init.query };
    }
    if (init.body) {
        store[BODY_SYMBOL] = { ...init.body };
    }

    const headers = new Headers(init.headers || {});

    return {
        request: new Request('http://localhost/'),
        params: init.params || {},
        path: init.path || '/',
        method: init.method || 'GET',
        mountPath: '',
        headers,
        searchParams: new URLSearchParams(),
        store,
        // A response envelope, so a helper that WRITES (a cookie, a header) can
        // be asserted rather than silently throwing into a caller's catch.
        response: {
            headers: new Headers(),
            status: 200,
        },
    } as unknown as IAppEvent;
}
