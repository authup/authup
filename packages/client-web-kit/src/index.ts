import type { Plugin } from 'vue';
import { install } from './module.ts';
import type { Options } from './types.ts';

export * from './components/index.ts';
export * from './composables/index.ts';
export * from './core/index.ts';
export * from './types.ts';

export { install };

export default { install } satisfies Plugin<Options | undefined>;

