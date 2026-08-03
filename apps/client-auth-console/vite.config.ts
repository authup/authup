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
import tailwindcss from '@tailwindcss/vite';
import { NuxtIconBundle } from '@nuxt/icon/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.resolve(__dirname, '..', '..', 'packages');
const repositoryRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
    base: '/public/',
    plugins: [
        vuePlugin(),
        tailwindcss(),
        // Bundle ONLY the icons this app renders, instead of registering the
        // whole Font Awesome 6 solid + brands collections at runtime (1,902
        // icons, ~429 KB gzip, for a few dozen used ones). The plugin scans
        // source for `<collection>:<name>` literals and emits them into
        // `virtual:nuxt-icon-bundle/register`, which registers through
        // `addIcon` from `@iconify/vue` — the same global store `<VCIcon>`
        // resolves against, so no component changes are needed.
        //
        // `cwd` is the repository root so the globs below can reach outside
        // this app AND so `@iconify-json/*` resolves from the hoisted
        // node_modules. Every path that can carry an icon name must be listed:
        //
        //  - this app's own source,
        //  - `@authup/client-web-kit` (its components and the identity-provider
        //    preset tables hold roughly half the icons),
        //  - `@vuecs/icons-font-awesome`, whose preset supplies the behavioral
        //    defaults (pagination arrows, submit-button icons, alert icons,
        //    collapse chevrons). Those names exist ONLY in that package, so
        //    omitting it silently renders those slots empty.
        //
        // `.ts` is added to the scanned extensions (the plugin default covers
        // `.vue`/`.jsx`/`.tsx` only) because several icon names live in plain
        // TypeScript modules.
        NuxtIconBundle({
            cwd: repositoryRoot,
            scan: {
                globInclude: [
                    'apps/client-auth-console/src/**/*.{vue,ts}',
                    'packages/client-web-kit/src/**/*.{vue,ts}',
                    'node_modules/@vuecs/icons-font-awesome/dist/*.mjs',
                ],
                globExclude: [],
            },
        }),
    ],
    resolve: {
        alias: {
            '@authup/core-kit': path.join(packagesRoot, 'core-kit', 'src'),
            '@authup/core-http-kit': path.join(packagesRoot, 'core-http-kit', 'src'),
            '@authup/kit': path.join(packagesRoot, 'kit', 'src'),
            '@authup/client-web-kit': path.join(packagesRoot, 'client-web-kit', 'src'),
            '@authup/client-web-kit-theme': path.join(packagesRoot, 'client-web-kit-theme', 'src'),
            '@authup/client-web-theme': path.join(packagesRoot, 'client-web-theme', 'src'),
            '@authup/specs': path.join(packagesRoot, 'specs', 'src'),
        },
    },
    ssr: { noExternal: true },
});
