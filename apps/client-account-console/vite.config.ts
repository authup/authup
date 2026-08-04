/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vuePlugin from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { NuxtIconBundle } from '@nuxt/icon/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.resolve(__dirname, '..', '..', 'packages');
const repositoryRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
    // The canonical mount point: server-core serves the bundle at
    // `<publicUrl>/account` (rebasing asset hrefs per request when publicUrl
    // carries a sub-path), and a standalone host serves the dist under
    // `/account` on its own origin. See src/config.ts for the runtime
    // configuration contract.
    base: '/account/',
    plugins: [
        vuePlugin(),
        tailwindcss(),
        // Bundle ONLY the icons this app renders — same setup as
        // apps/client-auth-console/vite.config.ts (see the rationale there).
        // Every path that can carry an icon name must be listed; a path that
        // stops matching yields an empty icon slot, not a build error.
        NuxtIconBundle({
            cwd: repositoryRoot,
            scan: {
                globInclude: [
                    'apps/client-account-console/src/**/*.{vue,ts}',
                    'packages/client-web-kit/src/**/*.{vue,ts}',
                    'node_modules/@vuecs/icons-font-awesome/dist/*.mjs',
                ],
                globExclude: [],
            },
        }),
    ],
    resolve: {
        // Single copy of the state/runtime singletons. The kit is bundled from
        // source, so without this its `pinia` resolves from
        // packages/client-web-kit/node_modules while the app's resolves here,
        // and the two `Symbol('pinia')` values never meet.
        dedupe: ['pinia', 'vue'],
        alias: {
            '@authup/access': path.join(packagesRoot, 'access', 'src'),
            '@authup/core-kit': path.join(packagesRoot, 'core-kit', 'src'),
            '@authup/core-http-kit': path.join(packagesRoot, 'core-http-kit', 'src'),
            '@authup/core-realtime-kit': path.join(packagesRoot, 'core-realtime-kit', 'src'),
            '@authup/errors': path.join(packagesRoot, 'errors', 'src'),
            '@authup/i18n': path.join(packagesRoot, 'i18n', 'src'),
            '@authup/kit': path.join(packagesRoot, 'kit', 'src'),
            '@authup/client-web-kit': path.join(packagesRoot, 'client-web-kit', 'src'),
            '@authup/client-web-kit-theme': path.join(packagesRoot, 'client-web-kit-theme', 'src'),
            '@authup/client-web-theme': path.join(packagesRoot, 'client-web-theme', 'src'),
            '@authup/specs': path.join(packagesRoot, 'specs', 'src'),
        },
    },
});
