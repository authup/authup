/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App, Component } from 'vue';
import * as components from './components/entities';
import {
    installHTTPClient, installHTTPClientAuthenticationHook,
    installSocketManager,
    installStore,
    installTranslator,
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
            if (input.indexOf(componentName) !== -1) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                app.component(componentName, component as Component);
            }
        });
}

export function install(app: App, options: Options): void {
    if (options.realtime) {
        installSocketManager(app, {
            pinia: options.pinia,
            baseURL: options.realtimeURL || options.baseURL,
        });
    }

    installStore(app, {
        pinia: options.pinia,
        baseURL: options.baseURL,
        cookieSet: options.cookieSet,
        cookieGet: options.cookieGet,
        cookieUnset: options.cookieUnset,
    });

    installHTTPClientAuthenticationHook(app, {
        pinia: options.pinia,
        baseURL: options.baseURL,
        isServer: options.isServer,
    });

    installHTTPClient(app, {
        pinia: options.pinia,
        baseURL: options.baseURL,
        isServer: options.isServer,
    });

    installTranslator(app, {
        locale: options.translatorLocale,
    });

    installComponents(app, options.components);
}
