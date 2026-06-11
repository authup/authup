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
 * Per-request handoff of an HTTP-client override into renderUIPage —
 * same mechanism as VITE_SERVER_STORE_KEY. Registered only when a
 * client is bound in the DI container (test injection); production
 * mounts nothing.
 */
export const UI_HTTP_CLIENT_STORE_KEY = Symbol('UIHttpClient');

export function registerUIHttpClientMiddleware(router: App, httpClient: Client) {
    router.use(defineCoreHandler((event) => {
        event.store[UI_HTTP_CLIENT_STORE_KEY] = httpClient;
        return event.next();
    }));
}
