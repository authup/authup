/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useToast } from 'vue-toastification';
import { definePageMeta, resolveComponent } from '#imports';
import { LayoutKey } from '../../../config/layout';
import { useAuthStore } from '../../../store/auth';

export default defineComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        });

        const { user } = useAuthStore();

        const handleUpdated = () => {
            const toast = useToast();
            toast.success('The account was successfully updated.');
        };

        const handleFailed = (e) => {
            const toast = useToast();
            toast.warning(e.message);
        };

        const userForm = resolveComponent('UserForm');
        return () => h('div', [
            h('h6', { class: 'title' }, ['General']),
            h(userForm, {
                canManage: false,
                realmId: user.realm_id,
                entity: user,
                onUpdated: handleUpdated,
                onFailed: handleFailed,
            }),
        ]);
    },
});
