import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'testing/index': 'src/testing/index.ts',
    },
    format: 'esm',
    sourcemap: true,
});
