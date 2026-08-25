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

export default defineConfig(({ command }) => ({
    // The auth console's namespace, mirroring the two static consoles
    // (`/console/admin/`, `/console/account/`). Only the client assets live
    // under it: vite emits them into `assets/` (its default assetsDir), so
    // the hrefs read `/console/auth/assets/<hash>.js` and server-core mounts
    // exactly that directory (rebasing the hrefs per request when publicUrl
    // carries a sub-path). The page routes (/authorize, /logout, /register,
    // ...) stay where discovery and the mail deep links point, and
    // `/console/auth` itself serves nothing.
    base: '/console/auth/',
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
        // The kit is bundled from source (see the aliases below), so `pinia`
        // and `vue` resolve from packages/client-web-kit/node_modules for kit
        // modules and from this app for app modules. Two copies of pinia mean
        // two `Symbol('pinia')` values, so `app.use(pinia)` provides under one
        // and the kit's `injectStore()` injects the other. It only appears to
        // work because installing the store calls the factory with an explicit
        // instance, which sets `activePinia` inside the kit's copy - a MODULE
        // GLOBAL. Every SSR request builds its own pinia, so under concurrent
        // renders that global points at whichever request installed last and a
        // kit component can read another request's session.
        dedupe: ['pinia', 'vue'],
        alias: {
            '@authup/access': path.join(packagesRoot, 'access', 'src'),
            '@authup/core-kit': path.join(packagesRoot, 'core-kit', 'src'),
            '@authup/core-realtime-kit': path.join(packagesRoot, 'core-realtime-kit', 'src'),
            '@authup/errors': path.join(packagesRoot, 'errors', 'src'),
            '@authup/i18n': path.join(packagesRoot, 'i18n', 'src'),
            '@authup/core-http-kit': path.join(packagesRoot, 'core-http-kit', 'src'),
            '@authup/kit': path.join(packagesRoot, 'kit', 'src'),
            '@authup/client-web-kit': path.join(packagesRoot, 'client-web-kit', 'src'),
            '@authup/client-web-kit-theme': path.join(packagesRoot, 'client-web-kit-theme', 'src'),
            '@authup/client-web-theme': path.join(packagesRoot, 'client-web-theme', 'src'),
            '@authup/specs': path.join(packagesRoot, 'specs', 'src'),
        },
    },
    // Bundle every dependency into the SSR build so the published
    // dist/server/server.js is self-contained for server-core to read.
    // Dev must NOT inline them: vue/server-renderer resolves to its CJS
    // build under the node condition, which the SSR module runner cannot
    // evaluate ("exports is not defined").
    ...(command === 'build' ? { ssr: { noExternal: true } } : {}),
    // Both halves of the build are declared here rather than passed as CLI
    // flags, so one `vite build` emits them via builder.buildApp(). The
    // three paths server-core reads are pinned by these values:
    // dist/client/index.html, dist/client/.vite/ssr-manifest.json and
    // dist/server/server.js.
    environments: {
        client: {
            build: {
                outDir: 'dist/client',
                ssrManifest: '.vite/ssr-manifest.json',
            },
        },
        ssr: {
            input: 'src/server.ts',
            build: {
                outDir: 'dist/server',
                rollupOptions: {
                    // The CLI form derived this from the entry name. Pin it,
                    // because server-core reads that exact filename.
                    output: { entryFileNames: 'server.js' },
                },
            },
        },
    },
    // Opt into builder.buildApp(). Plugin instances stay per-environment
    // (sharedPlugins defaults to false): plugins hold configResolved-scoped
    // state, and the two environments resolve differently enough (consumer,
    // build.ssr, outDir) that sharing one instance is not what this plugin
    // set is written for.
    builder: {},
}));
