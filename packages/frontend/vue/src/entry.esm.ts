import 'regenerator-runtime';

import Vue, { Component, PluginFunction } from 'vue';

// Import vue components
import * as components from './components';

// install function executed by Vue.use()
const install: PluginFunction<any> = function install(instance: typeof Vue) {
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
