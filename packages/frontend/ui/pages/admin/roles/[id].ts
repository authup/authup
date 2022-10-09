/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionID, Role } from '@authelion/common';
import { Ref } from 'vue';
import { useToast } from 'vue-toastification';
import { NuxtLink } from '#components';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import {
    definePageMeta, resolveComponent, useAPI,
} from '#imports';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';
import { buildDomainEntityNav } from '../../../composables/domain/enity-nav';

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

        const nuxtPage = resolveComponent('NuxtPage');

        const route = useRoute();

        const entity : Ref<Role> = ref(null);

        try {
            entity.value = await useAPI()
                .role
                .getOne(route.params.id as string);
        } catch (e) {
            return navigateTo({ path: '/admin/roles' });
        }

        const handleUpdated = (e: Role) => {
            toast.success('The role was successfully updated.');

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
                h('i', { class: 'fa-solid fa-user-group me-1' }),
                entity.value.name,
                h('span', { class: 'sub-title ms-1' }, [
                    'Details',
                ]),
            ]),
            h('div', { class: 'mb-2' }, [
                buildDomainEntityNav(`/admin/roles/${entity.value.id}`, items),
            ]),

            h('div', [
                h(nuxtPage, {
                    onUpdated: handleUpdated,
                    onFailed: handleFailed,
                    entity: entity.value,
                }),
            ]),

        ]);
    },
});
