/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { applyStoreManagerOptions, installStoreManager } from '@vuecs/list-controls/core';
import type { App, Component } from 'vue';
import * as components from './components';
import {
    installHTTPClient,
    installStore,
    installTranslator,
    provideSocketClientManager,
} from './core';
import type { Options } from './types';

export function installComponents(input?: boolean | string[]) {
    if (!input) {
        return;
    }

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

export function install(app: App, options: Options = {}): void {
    let baseURL : string | undefined;
    if (options.baseURL) {
        baseURL = options.baseURL;
    }

    if (options.socketClientManager) {
        provideSocketClientManager(options.socketClientManager, app);
    }

    installStore(app, {
        baseURL,
        cookieSet: options.cookieSet,
        cookieGet: options.cookieGet,
        cookieUnset: options.cookieUnset,
    });

    installHTTPClient(app, { baseURL });

    installTranslator(app, {
        locale: options.translatorLocale,
    });

    const storeManager = installStoreManager(app, 'authup');
    if (options.storeManager) {
        applyStoreManagerOptions(storeManager, options.storeManager);
    }

    installComponents(options.components);
}
