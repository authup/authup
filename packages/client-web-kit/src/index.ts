import type { Plugin } from 'vue';
import { install } from './module';
import type { Options } from './types';

export * from './components/entities';
export * from './composables';
export * from './core';
export * from './types';

export {
    install,
};

export default {
    install,
} satisfies Plugin<Options | undefined>;
