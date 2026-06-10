/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { syncTranslatorLocaleFromManager } from '@authup/client-web-kit';
import { defineNuxtPlugin } from '#imports';

/**
 * Keep ilingo (authup's catalogs) in sync with vuecs's resolved locale —
 * the source of truth. vuecs owns the `vc-locale` cookie via @vuecs/nuxt's
 * locale plugin (`name: 'vuecs-locale'`, `enforce: 'post'`); this must run
 * after it so the locale manager is installed.
 */
export default defineNuxtPlugin({
    name: 'authup:vuecs-locale-sync',
    dependsOn: ['vuecs-locale'],
    setup(ctx) {
        syncTranslatorLocaleFromManager(ctx.vueApp);
    },
});
