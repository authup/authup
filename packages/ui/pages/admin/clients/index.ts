/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, PermissionName } from '@authup/common';
import { useToast } from 'vue-toastification';
import { NuxtLink, NuxtPage } from '#components';
import { definePageMeta, resolveComponent } from '#imports';
import { buildDomainEntityNav } from '../../../composables/domain/enity-nav';
import { LayoutKey, LayoutNavigationID } from '../../../config/layout';

export default defineComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.CLIENT_EDIT,
                PermissionName.CLIENT_DROP,
                PermissionName.CLIENT_ADD,
            ],
        });

        const items = [
            {
                name: 'overview',
                urlSuffix: '',
                icon: 'fa fa-bars',
            },
            {
                name: 'add',
                urlSuffix: '/add',
                icon: 'fa fa-plus',
            },
        ];

        const handleDeleted = (e: Client) => {
            const toast = useToast();
            toast.success(`The client ${e.name} was successfully deleted.`);
        };

        const handleFailed = (e: Error) => {
            const toast = useToast();
            toast.warning(e.message);
        };

        return () => h('div', [
            h('h1', { class: 'title no-border mb-3' }, [
                h('i', { class: 'fa-solid fa-ghost me-1' }),
                'Client',
                h('span', { class: 'sub-title ms-1' }, [
                    'Management',
                ]),
            ]),
            h('div', { class: 'content-wrapper' }, [
                h('div', { class: 'content-sidebar flex-column' }, [
                    buildDomainEntityNav('/admin/clients', items, { direction: 'vertical' }),
                ]),
                h('div', { class: 'content-container' }, [
                    h(NuxtPage, {
                        onDeleted: handleDeleted,
                        onFailed: handleFailed,
                    }),
                ]),
            ]),
        ]);
    },
});
