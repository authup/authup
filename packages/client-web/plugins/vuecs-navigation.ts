/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectStore } from '@authup/client-web-kit';
import { injectNavigationManager, install as installNavigation } from '@vuecs/navigation';
import type { Pinia } from 'pinia';
import { defineNuxtPlugin } from '#imports';
import { Navigation } from '../config/layout';

export default defineNuxtPlugin({
    dependsOn: ['authup'],
    setup(ctx) {
        const store = injectStore(ctx.$pinia as Pinia);
        const navigation = new Navigation(store);

        installNavigation(ctx.vueApp, {
            items: ({
                level,
                parent,
            }) => navigation.getItems(level, parent),
        });

        const navigationManager = injectNavigationManager(ctx.vueApp);

        ctx.hook(
            'authup:middleware:end',
            async ({ to }) => {
                await navigationManager.build({
                    path: to.fullPath,
                });
            },
        );

        // todo: listen for access token caches, when changed: clear navigationManager cache
    },
});
