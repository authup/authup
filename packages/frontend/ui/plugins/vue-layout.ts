/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Utils, { Config, Preset } from '@vue-layout/utils';
import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((ctx) => {
    ctx.vueApp.use(Utils, {
        preset: {
            [Preset.BOOTSTRAP_V5]: {
                enabled: true,
            },
            [Preset.FONT_AWESOME]: {
                enabled: true,
            },
        },
    } as Partial<Config>);
});
