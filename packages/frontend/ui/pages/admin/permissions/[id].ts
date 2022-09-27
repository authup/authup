/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Permission, PermissionID } from '@authelion/common';
import { useToast } from 'vue-toastification';
import { NuxtLink, NuxtPageWrapper } from '#components';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import {
    definePageMeta, useAPI,
} from '#imports';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionID.PERMISSION_EDIT,
            ],
        });

        const route = useRoute();

        let entity: Permission;

        try {
            entity = await useAPI()
                .permission
                .getOne(route.params.id as string);
        } catch (e) {
            return navigateTo({ path: '/admin/robots' });
        }

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Users', icon: 'fas fa-user', urlSuffix: 'users',
            },
            {
                name: 'Robots', icon: 'fas fa-robot', urlSuffix: 'robots',
            },
            {
                name: 'Roles', icon: 'fas fa-user-group', urlSuffix: 'roles',
            },
        ];

        const handleUpdated = () => {
            const toast = useToast();
            toast.success('The permission was successfully updated.');
        };

        const handleFailed = (e) => {
            const toast = useToast();
            toast.warning(e.message);
        };

        return () => h('div', [
            h('h1', { class: 'title no-border mb-3' }, [
                h('i', { class: 'fa fa-robot me-1' }),
                entity.id,
                h('span', { class: 'sub-title ms-1' }, [
                    'Details',
                ]),
            ]),
            h('div', { class: 'mb-2' }, [
                h(
                    'ul',
                    { class: 'nav nav-pills' },
                    items.map((item) => h('li', { class: 'nav-item' }, [
                        h(
                            NuxtLink,
                            {
                                class: 'nav-link',
                                to: `/admin/permissions/${entity.id}/${item.urlSuffix}`,
                            },
                            {
                                default: () => [
                                    h('i', { class: `${item.icon} pe-1` }),
                                    item.name,
                                ],
                            },
                        ),
                    ])),
                ),
            ]),

            h('div', [
                h(NuxtPageWrapper, {
                    onUpdated: handleUpdated,
                    onFailed: handleFailed,
                    entity,
                }),
            ]),

        ]);
    },
});
