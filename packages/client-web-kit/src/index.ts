import { applyStoreManagerOptions, installStoreManager } from '@vuecs/list-controls/core';
import type { App, Component, Plugin } from 'vue';
import * as components from './components';
import type { Options } from './types';
import {
    installTranslator,
    provideAPIClient,
    provideSocketClientManager,
    provideStore,
} from './core';

export function install(app: App, options: Options = {}) : void {
    if (options.apiClient) {
        provideAPIClient(options.apiClient, app);
    }

    if (options.socketClientManager) {
        provideSocketClientManager(options.socketClientManager, app);
    }

    if (options.store) {
        provideStore(options.store, app);
    }

    installTranslator(app, {
        locale: options.translatorLocale,
    });

    const storeManager = installStoreManager(app, 'authup');
    if (options.storeManager) {
        applyStoreManagerOptions(storeManager, options.storeManager);
    }

    if (options.components) {
        let componentsSelected : undefined | string[];
        if (typeof options.components !== 'boolean') {
            componentsSelected = options.components;
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
}

export default {
    install,
} satisfies Plugin<Options | undefined>;

export * from './components';
export * from './composables';
export * from './core';
export * from './types';
