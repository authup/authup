/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidup } from '@validup/vue';
import { OptionalValue } from 'validup';
import type { App, Component } from 'vue';
import * as components from './components/entities';
import {
    installHTTPClient,
    installHTTPClientAuthenticationHook,
    installSocketManager,
    installStore,
    installTranslator,
    provideHydrationStore,
} from './core';
import type { Options } from './types';

export function installComponents(app: App, input?: boolean | string[]) {
    if (typeof input === 'undefined' || input === false) {
        return;
    }

    if (typeof input === 'boolean') {
        Object.entries(components)
            .forEach(([componentName, component]) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                app.component(componentName, component as Component);
            });

        return;
    }

    Object.entries(components)
        .forEach(([componentName, component]) => {
            if (input.includes(componentName)) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                app.component(componentName, component as Component);
            }
        });
}

export function install(app: App, options: Options): void {
    if (options.hydrationStore) {
        provideHydrationStore(options.hydrationStore, app);
    }

    if (options.realtime) {
        installSocketManager(app, {
            pinia: options.pinia,
            baseURL: options.realtimeURL || options.baseURL,
        });
    }

    installStore(app, {
        pinia: options.pinia,
        baseURL: options.baseURL,
        httpClient: options.httpClient,
        cookieSet: options.cookieSet,
        cookieGet: options.cookieGet,
        cookieUnset: options.cookieUnset,
    });

    installHTTPClientAuthenticationHook(app, {
        pinia: options.pinia,
        baseURL: options.baseURL,
        httpClient: options.httpClient,
        isServer: options.isServer,
    });

    installHTTPClient(app, {
        pinia: options.pinia,
        baseURL: options.baseURL,
        httpClient: options.httpClient,
        isServer: options.isServer,
    });

    installTranslator(app, { locale: options.translatorLocale });

    // Register @validup/vue's `createValidup` plugin with authup's
    // form-friendly defaults: treat `undefined`, `null`, and empty strings
    // as "missing" for every mount that declares `optional: true` without
    // its own `optionalValue` override, and emit `null` to the backend
    // for those missing fields. Matches the entity-validator pattern
    // across the codebase (every nullable FK / optional string column is
    // typed as `z.X().nullable()` — a blank input should land as `null`,
    // not `''`).
    app.use(createValidup({
        optionalValue: [OptionalValue.UNDEFINED, OptionalValue.NULL, OptionalValue.EMPTY_STRING],
        optionalAs: null,
    }));

    installComponents(app, options.components);

    // NOTE: `@vuecs/forms` and `@vuecs/pagination` are NOT installed here.
    // Both `installForms` / `installPagination` internally call
    // `installThemeManager(app, {})` which is first-install-wins (per the
    // `inject(THEME_MANAGER_SYMBOL); if (existing) return existing;` check
    // in `@vuecs/core`). Installing them inside the kit before the app's
    // own `app.use(vuecs, { themes: [...] })` runs would freeze the theme
    // manager with no themes, silently dropping every theme override.
    // The consumer plugin (see apps/client-web/plugins/vuecs.ts) installs
    // `vuecs` first, then the per-package plugins on top.
}
