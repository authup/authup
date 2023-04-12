/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRouter } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
        });

        const router = useRouter();

        const query = {
            redirect: '',
        };

        const { redirect } = router.currentRoute.value.query;

        if (
            redirect &&
            typeof redirect === 'string' &&
            !redirect.includes('logout')
        ) {
            query.redirect = redirect;
        }

        const store = useAuthStore();
        await store.logout();

        await router.push({ path: '/login', query });
    },
});
