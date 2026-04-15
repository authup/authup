import { defineConfig } from 'tsdown';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    entry: 'src/index.ts',
    format: 'esm',
    dts: false,
    sourcemap: true,
    plugins: [
        vue(),
    ],
});
