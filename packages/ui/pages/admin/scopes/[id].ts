/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionName, Scope,
} from '@authup/common';
import { Ref } from 'vue';
import { useToast } from 'vue-toastification';
import { NuxtPage } from '#components';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import {
    definePageMeta, useAPI,
} from '#imports';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';
import { buildDomainEntityNav } from '../../../composables/domain/enity-nav';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SCOPE_EDIT,
            ],
        });

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Clients', icon: 'fa-solid fa-ghost', urlSuffix: '/clients',
            },
        ];

        const toast = useToast();

        const route = useRoute();

        const entity: Ref<Scope> = ref(null) as any;

        try {
            entity.value = await useAPI()
                .scope
                .getOne(route.params.id as string);
        } catch (e) {
            return navigateTo({ path: '/admin/scopes' });
        }

        const handleUpdated = (e: Scope) => {
            toast.success('The scope was successfully updated.');

            const keys = Object.keys(e) as (keyof Scope)[];
            for (let i = 0; i < keys.length; i++) {
                entity.value[keys[i]] = e[keys[i]];
            }
        };

        const handleFailed = (e: Error) => {
            toast.warning(e.message);
        };

        return () => h('div', [
            h('h1', { class: 'title no-border mb-3' }, [
                h('i', { class: 'fa-solid fa-ghost me-1' }),
                entity.value.name,
                h('span', { class: 'sub-title ms-1' }, [
                    'Details',
                ]),
            ]),
            h('div', { class: 'mb-2' }, [
                buildDomainEntityNav(`/admin/scopes/${entity.value.id}`, items, { prevLink: true }),
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
