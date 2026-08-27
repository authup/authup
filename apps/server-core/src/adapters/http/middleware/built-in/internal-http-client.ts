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
 * Per-request handoff of an HTTP-client factory to the routes that call this
 * server's own API. Since the consoles left, that is the console login's
 * token exchange alone.
 *
 * The wiring passes a thunk over the DI container
 * (`() => container.resolve(InternalHttpClient)`) whose registration carries
 * `lifetime: 'transient'`, so every request resolves a fresh client. Never
 * share one instance: the authentication hook writes per-user state onto it.
 * Production binds the internal loopback client by default
 * (`HTTPModule.registerInternalHttpClient`); tests may pre-register a fake.
 */
export const INTERNAL_HTTP_CLIENT_FACTORY_STORE_KEY = Symbol('InternalHttpClientFactory');

export function registerInternalHttpClientMiddleware(router: App, httpClientFactory: () => IClient) {
    router.use(defineCoreHandler((event) => {
        event.store[INTERNAL_HTTP_CLIENT_FACTORY_STORE_KEY] = httpClientFactory;
        return event.next();
    }));
}
