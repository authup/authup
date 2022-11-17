/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Toast, { POSITION, PluginOptions } from 'vue-toastification';
import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((ctx) => {
    const options : PluginOptions = {
        icon: false,
        position: POSITION.TOP_CENTER,
    };

    ctx.vueApp.use(Toast, options);
});
