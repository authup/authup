/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { defineConfig } from 'vite';
import vuePlugin from '@vitejs/plugin-vue';

export default defineConfig(() => ({
    base: '/public/',
    plugins: [
        vuePlugin(),
    ],
    resolve: {
        alias: {
            '@authup/core-kit': path.join(__dirname, '..', '..', 'core-kit', 'src'),
            '@authup/core-http-kit': path.join(__dirname, '..', '..', 'core-http-kit', 'src'),
            '@authup/kit': path.join(__dirname, '..', '..', 'kit', 'src'),
            '@authup/client-web-kit': path.join(__dirname, '..', '..', 'client-web-kit', 'src'),
            '@authup/specs': path.join(__dirname, '..', '..', 'specs', 'src'),
        },
    },
}));
