/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vuePlugin from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.resolve(__dirname, '..', '..', '..', 'packages');

export default defineConfig({
    root: path.resolve(__dirname, '..'),
    // the guard spec imports the kit, which is bundled from source (.vue)
    plugins: [vuePlugin()],
    resolve: {
        alias: {
            '@authup/access': path.join(packagesRoot, 'access', 'src'),
            '@authup/core-kit': path.join(packagesRoot, 'core-kit', 'src'),
            '@authup/core-http-kit': path.join(packagesRoot, 'core-http-kit', 'src'),
            '@authup/kit': path.join(packagesRoot, 'kit', 'src'),
            '@authup/client-web-kit': path.join(packagesRoot, 'client-web-kit', 'src'),
            '@authup/specs': path.join(packagesRoot, 'specs', 'src'),
        },
    },
    test: {
        include: ['test/unit/**/*.spec.ts'],
        // happy-dom: the guard's sessionStorage stashes and the config's
        // window reads are what the specs are for
        environment: 'happy-dom',
    },
});
