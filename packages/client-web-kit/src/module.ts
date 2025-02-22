/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App, Component } from 'vue';
import * as components from './components';
import {
    installHTTPClient,
    installSocketManager,
    installStore,
    installTranslator,
} from './core';
import type { Options } from './types';

export function installComponents(app: App, input?: boolean | string[]) {
    let componentsSelected: undefined | string[];
    if (typeof input !== 'boolean') {
        componentsSelected = input;
    }

    Object.entries(components)
        .forEach(([componentName, component]) => {
            if (
                !Array.isArray(componentsSelected) ||
                componentsSelected.indexOf(componentName) !== -1
            ) {
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
