/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import type { App } from 'routup';
import { defineCoreHandler } from 'routup';

/**
 * Per-request handoff of an HTTP-client factory into renderUIPage —
 * same mechanism as VITE_SERVER_STORE_KEY. Registered only when a
 * factory is bound in the DI container (test injection); production
 * mounts nothing. renderUIPage invokes the factory per render so every
 * SSR pass gets a fresh client — never share one client instance
 * across renders (the authentication hook writes per-user state onto
 * it).
 */
export const UI_HTTP_CLIENT_FACTORY_STORE_KEY = Symbol('UIHttpClientFactory');

export function registerUIHttpClientMiddleware(router: App, httpClientFactory: () => Client) {
    router.use(defineCoreHandler((event) => {
        event.store[UI_HTTP_CLIENT_FACTORY_STORE_KEY] = httpClientFactory;
        return event.next();
    }));
}
