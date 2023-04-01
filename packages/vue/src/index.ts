import type { App, Component, Plugin } from 'vue';
import type { ComponentsOptions } from '@vue-layout/hyperscript';
import { setPresets as _setPresets } from '@vue-layout/hyperscript';
// Import vue components
import * as components from './components';
import type { InstallOptions } from './type';
import { setHTTPClient } from './utils';

// install function executed by Vue.use()
const install: Plugin = function install(instance: App, options?: InstallOptions) {
    options = options || {};

    if (options.httpClient) {
        setHTTPClient(options.httpClient);
    }

    if (options.presets) {
        setPresets(options.presets);
    }

    Object.entries(components).forEach(([componentName, component]) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        instance.component(componentName, component as Component);
    });
};

function setPresets(presets: Record<string, ComponentsOptions>) {
    _setPresets(presets);
}

export {
    install,
    setPresets,
};

// Create module definition for Vue.use()
export default install;

// To allow individual component use, export components
// each can be registered via Vue.component()
export * from './components';
export * from './composables';
export * from './utils';
