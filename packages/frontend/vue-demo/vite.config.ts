import { URL, fileURLToPath } from 'node:url';
import path from 'path';

// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vite';
// eslint-disable-next-line import/no-extraneous-dependencies
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@authelion/common': path.join(__dirname, '..', '..', 'shared', 'common', 'src'),
            '@authelion/vue': path.join(__dirname, '..', 'vue', 'src'),
        },
    },
});
