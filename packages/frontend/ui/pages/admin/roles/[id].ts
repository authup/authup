/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionID, Role } from '@authelion/common';
import { useToast } from 'vue-toastification';
import { NuxtLink } from '#components';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import {
    definePageMeta, resolveComponent, useAPI,
} from '#imports';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionID.ROLE_EDIT,
                PermissionID.USER_ROLE_ADD,
                PermissionID.USER_ROLE_EDIT,
                PermissionID.USER_ROLE_DROP,
            ],
        });

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Permissions', icon: 'fas fa-user-secret', urlSuffix: 'permissions',
            },
            {
                name: 'Users', icon: 'fas fa-users', urlSuffix: 'users',
            },
        ];

        const toast = useToast();

        const handleUpdated = () => {
            toast.success('The role was successfully updated.');
        };

        const handleFailed = (e) => {
            toast.warning(e.message);
        };

        const nuxtPage = resolveComponent('NuxtPage');

        const route = useRoute();

        let entity: Role;

        try {
            entity = await useAPI()
                .role
                .getOne(route.params.id as string);
        } catch (e) {
            return navigateTo({ path: '/admin/roles' });
        }

        return () => h('div', [
            h('h1', { class: 'title no-border mb-3' }, [
                h('i', { class: 'fa-solid fa-user-group me-1' }),
                entity.name,
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
                                to: `/admin/roles/${entity.id}/${item.urlSuffix}`,
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
                h(nuxtPage, {
                    onUpdated: handleUpdated,
                    onFailed: handleFailed,
                    entity,
                }),
            ]),

        ]);
    },
});
