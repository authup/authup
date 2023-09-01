import { applyPluginBaseOptions } from '@vue-layout/list-controls/core';
import type { App, Component, Plugin } from 'vue';
import * as components from './components';
import type { Options } from './type';
import { provideAPIClient, provideSocketClient, provideStore } from './core';

export function install(app: App, options?: Options) : void {
    options = options || {};

    if (options.apiClient) {
        provideAPIClient(app, options.apiClient);
    }

    if (options.socketClient) {
        provideSocketClient(app, options.socketClient);
    }

    if (options.store) {
        provideStore(app, options.store);
    }

    applyPluginBaseOptions(options);

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
export * from './core';
export * from './translator';
