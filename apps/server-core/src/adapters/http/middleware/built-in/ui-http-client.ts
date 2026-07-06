/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IClient } from '@authup/core-http-kit';
import type { App } from 'routup';
import { defineCoreHandler } from 'routup';

/**
 * Per-request handoff of an HTTP-client factory into renderUIPage —
 * same mechanism as VITE_SERVER_STORE_KEY. The wiring passes a thunk
 * over the DI container (`() => container.resolve(UIHttpClient)`)
 * whose registration carries `lifetime: 'transient'`, so every SSR
 * render resolves a fresh client — never share one client instance
 * across renders (the authentication hook writes per-user state onto
 * it). Production binds the internal loopback client by default
 * (`HTTPModule.registerUIHttpClient`); tests may pre-register a fake.
 */
export const UI_HTTP_CLIENT_FACTORY_STORE_KEY = Symbol('UIHttpClientFactory');

export function registerUIHttpClientMiddleware(router: App, httpClientFactory: () => IClient) {
    router.use(defineCoreHandler((event) => {
        event.store[UI_HTTP_CLIENT_FACTORY_STORE_KEY] = httpClientFactory;
        return event.next();
    }));
}
