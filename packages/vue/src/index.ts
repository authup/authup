import type { Component, Plugin } from 'vue';

// Import vue components
import * as components from './components';
import type { InstallOptions } from './type';
import { setHTTPClient } from './utils';

// install function executed by Vue.use()
const install: Plugin = function install(instance, options?: InstallOptions) {
    options = options || {};

    if (options.httpClient) {
        setHTTPClient(options.httpClient);
    }

    Object.entries(components).forEach(([componentName, component]) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        instance.component(componentName, component as Component);
    });
};

// Create module definition for Vue.use()
export default install;

// To allow individual component use, export components
// each can be registered via Vue.component()
export * from './components';
export * from './composables';
export * from './utils';
