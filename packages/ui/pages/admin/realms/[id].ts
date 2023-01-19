/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName, Realm, isRealmResourceWritable } from '@authup/common';
import { storeToRefs } from 'pinia';
import { Ref } from 'vue';
import { useToast } from 'vue-toastification';
import { NuxtPage } from '#components';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import {
    definePageMeta, updateObjectProperties, useAPI,
} from '#imports';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';
import { buildDomainEntityNav } from '../../../composables/domain/enity-nav';
import { useAuthStore } from '../../../store/auth';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_EDIT,
            ],
        });

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
        ];

        const toast = useToast();

        const route = useRoute();

        const entity: Ref<Realm> = ref(null) as any;

        try {
            entity.value = await useAPI()
                .realm
                .getOne(route.params.id as string);
        } catch (e) {
            return navigateTo({ path: '/admin/realms' });
        }

        const store = useAuthStore();
        const { realmManagement } = storeToRefs(store);

        if (!isRealmResourceWritable(realmManagement.value, entity.value.id)) {
            return navigateTo({ path: '/admin/realms' });
        }

        const handleUpdated = (e: Realm) => {
            toast.success('The realm was successfully updated.');

            updateObjectProperties(entity, e);
        };

        const handleFailed = (e: Error) => {
            toast.warning(e.message);
        };

        return () => h('div', [
            h('h1', { class: 'title no-border mb-3' }, [
                h('i', { class: 'fa fa-university me-1' }),
                entity.value.name,
                h('span', { class: 'sub-title ms-1' }, [
                    'Details',
                ]),
            ]),
            h('div', { class: 'mb-2' }, [
                buildDomainEntityNav(`/admin/realms/${entity.value.id}`, items, { prevLink: true }),
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
