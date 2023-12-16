/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildNavigation } from '@vue-layout/navigation';

export default defineNuxtRouteMiddleware(async (to, from) => {
    await buildNavigation({ url: to.fullPath });
});
