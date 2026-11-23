import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        core: 'src/core/index.ts',
    },
    format: 'esm',
    sourcemap: true,
});
