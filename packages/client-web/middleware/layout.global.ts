/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectNavigationManager } from '@vuecs/navigation';
import { defineNuxtRouteMiddleware } from '#imports';

export default defineNuxtRouteMiddleware(async (route) => {
    const navigationManager = injectNavigationManager();
    await navigationManager.buildOnce({ path: route.fullPath });
});
