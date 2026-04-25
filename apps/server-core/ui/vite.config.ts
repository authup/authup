/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vuePlugin from '@vitejs/plugin-vue';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.resolve(__dirname, '..', '..', '..', 'packages');

export default defineConfig(() => ({
    base: '/public/',
    plugins: [
        vuePlugin(),
    ],
    resolve: {
        alias: {
            '@authup/core-kit': path.join(packagesRoot, 'core-kit', 'src'),
            '@authup/core-http-kit': path.join(packagesRoot, 'core-http-kit', 'src'),
            '@authup/kit': path.join(packagesRoot, 'kit', 'src'),
            '@authup/client-web-kit': path.join(packagesRoot, 'client-web-kit', 'src'),
            '@authup/specs': path.join(packagesRoot, 'specs', 'src'),
        },
    },
    ssr: { noExternal: true },
}));
