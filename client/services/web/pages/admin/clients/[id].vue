<script lang="ts">
import type { Client } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { storeToRefs } from 'pinia';
import type { Ref } from 'vue';
import { ref } from 'vue';
import {
    createError,
    defineNuxtComponent,
    definePageMeta,
    navigateTo,
    useAPI,
    useRoute,
    useToast,
} from '#imports';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';
import { useAuthStore } from '../../../store/auth';
import { updateObjectProperties } from '../../../utils';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.CLIENT_EDIT,
            ],
        });

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Scopes', icon: 'fa-solid fa-meteor', urlSuffix: '/scopes',
            },
            {
                name: 'URL', icon: 'fa-solid fa-link', urlSuffix: '/url',
            },
        ];

        const toast = useToast();

        const route = useRoute();

        const entity: Ref<Client> = ref(null) as any;

        try {
            entity.value = await useAPI()
                .client
                .getOne(route.params.id as string, { fields: ['+secret'] });
        } catch (e) {
            await navigateTo({ path: '/admin/clients' });
            throw createError({});
        }

        const store = useAuthStore();
        const { realmManagement } = storeToRefs(store);

        if (!isRealmResourceWritable(realmManagement.value, entity.value.realm_id)) {
            await navigateTo({ path: '/admin/clients' });
            throw createError({});
        }

        const handleUpdated = (e: Client) => {
            if (toast) {
                toast.show({ variant: 'success', body: 'The client was successfully updated.' });
            }

            updateObjectProperties(entity, e);
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({ variant: 'success', body: e.message });
            }
        };

        return {
            entity,
            items,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <h1 class="title no-border mb-3">
            <i class="fa-solid fa-ghost me-1" /> {{ entity.name }}
            <span class="sub-title ms-1">Details</span>
        </h1>
        <div class="mb-2">
            <DomainEntityNav
                :path="'/admin/clients/'+entity.id"
                :items="items"
                :prev-link="true"
            />
        </div>
        <div>
            <NuxtPage
                :entity="entity"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
    </div>
</template>
