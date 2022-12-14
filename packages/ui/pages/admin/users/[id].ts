/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName, User } from '@authup/common';
import { Ref } from 'vue';
import { useToast } from 'vue-toastification';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import { NuxtPage } from '#components';
import { definePageMeta, useAPI } from '#imports';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';
import { buildDomainEntityNav } from '../../../composables/domain/enity-nav';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.USER_EDIT,
                PermissionName.USER_ROLE_ADD,
                PermissionName.USER_ROLE_EDIT,
                PermissionName.USER_ROLE_DROP,
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
                name: 'Roles', icon: 'fa-solid fa-user-group', urlSuffix: 'roles',
            },
        ];

        const toast = useToast();

        const route = useRoute();

        const entity : Ref<User> = ref(null);

        try {
            entity.value = await useAPI()
                .user
                .getOne(route.params.id as string, { fields: ['+email'] });
        } catch (e) {
            return navigateTo({ path: '/admin/roles' });
        }

        const handleUpdated = (e: User) => {
            toast.success('The user was successfully updated.');

            const keys = Object.keys(e);
            for (let i = 0; i < keys.length; i++) {
                entity.value[keys[i]] = e[keys[i]];
            }
        };

        const handleFailed = (e) => {
            toast.warning(e.message);
        };

        return () => h('div', [
            h('h1', { class: 'title no-border mb-3' }, [
                h('i', { class: 'fa fa-user me-1' }),
                entity.value.name,
                h('span', { class: 'sub-title ms-1' }, [
                    'Details',
                ]),
            ]),
            h('div', { class: 'mb-2' }, [
                buildDomainEntityNav(`/admin/users/${entity.value.id}`, items, { prevLink: true }),
            ]),

            h('div', [
                h(NuxtPage, {
                    onUpdated: handleUpdated,
                    onFailed: handleFailed,
                    entity: entity.value,
                }),
            ]),

        ]);
    },
});
