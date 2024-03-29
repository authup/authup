<script lang="ts">

import type { IdentityProvider } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import type { Ref } from 'vue';
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
                PermissionName.PROVIDER_EDIT,
            ],
        });

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Roles', icon: 'fa-solid fa-theater-masks', urlSuffix: 'roles',
            },
        ];

        const toast = useToast();

        const route = useRoute();

        const entity: Ref<IdentityProvider> = ref(null) as any;

        try {
            entity.value = await useAPI()
                .identityProvider
                .getOne(route.params.id as string);
        } catch (e) {
            await navigateTo({ path: '/admin/identity-providers' });
            throw createError({});
        }

        const store = useAuthStore();
        const { realmManagement } = storeToRefs(store);

        if (!isRealmResourceWritable(realmManagement.value, entity.value.realm_id)) {
            await navigateTo({ path: '/admin/identity-providers' });
            throw createError({});
        }

        const handleUpdated = (e: IdentityProvider) => {
            toast.show({ variant: 'success', body: 'The identity-provider was successfully updated.' });

            updateObjectProperties(entity, e);
        };

        const handleFailed = (e: Error) => {
            toast.show({ variant: 'warning', body: e.message });
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
            <i class="fa-solid fa-atom me-1" /> {{ entity.name }}
            <span class="sub-title ms-1">Details</span>
        </h1>
        <div class="mb-2">
            <DomainEntityNav
                :path="'/admin/identity-providers/'+entity.id"
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
