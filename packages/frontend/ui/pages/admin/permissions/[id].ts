/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Permission, PermissionID, Role } from '@authelion/common';
import { Ref } from 'vue';
import { useToast } from 'vue-toastification';
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
                PermissionID.PERMISSION_EDIT,
            ],
        });

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

        const toast = useToast();

        const nuxtPage = resolveComponent('NuxtPage');

        const route = useRoute();

        const entity: Ref<Permission> = ref(null);

        try {
            entity.value = await useAPI()
                .permission
                .getOne(route.params.id as string);
        } catch (e) {
            return navigateTo({ path: '/admin/robots' });
        }

        const handleUpdated = (e: Permission) => {
            toast.success('The permission was successfully updated.');

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
                h('i', { class: 'fa fa-robot me-1' }),
                entity.value.id,
                h('span', { class: 'sub-title ms-1' }, [
                    'Details',
                ]),
            ]),
            h('div', { class: 'mb-2' }, [
                buildDomainEntityNav(`/admin/permissions/${entity.value.id}`, items),
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
