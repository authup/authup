/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            // The bootstrap registers the build-time icon subset through a
            // virtual module the @nuxt/icon vite plugin emits. Running the
            // whole plugin here would buy nothing: the specs assert markup
            // and behaviour, and <VCIcon> resolves icons client-side anyway,
            // so a rendered page carries empty svg shells either way.
            'virtual:nuxt-icon-bundle/register': path.join(import.meta.dirname, 'stubs', 'icon-bundle.ts'),
        },
    },
    test: {
        environment: 'happy-dom',
        include: ['test/unit/**/*.spec.ts'],
    },
});
