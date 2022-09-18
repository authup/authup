/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmList } from '@authelion/vue';
import { defineNuxtComponent, definePageMeta, h } from '#imports';
import { useAPI } from '../composables/api';
import { LayoutKey, LayoutNavigationID } from '../config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
        });

        const app = useAPI();
        const { data } = await app.realm.getMany();

        return () => h(RealmList);
    },
});
