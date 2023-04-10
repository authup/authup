import type { App, Component, Plugin } from 'vue';
import * as components from './components';
import type { Options } from './type';
import { setAPIClient } from './utils';

// install function executed by Vue.use()
export function install(instance: App, options?: Options) : void {
    options = options || {};

    if (options.apiClient) {
        setAPIClient(options.apiClient);
    }

    // if (options.presets) {
    // setPresets(options.presets);
    // }

    Object.entries(components).forEach(([componentName, component]) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        instance.component(componentName, component as Component);
    });
}

export default {
    install,
} satisfies Plugin<Options | undefined>;

export * from './components';
export * from './composables';
export * from './language';
export * from './utils';
