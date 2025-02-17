<script lang="ts">

import { injectHTTPClient } from '@authup/client-web-kit';
import type { IdentityProvider } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { defineComponent, ref } from 'vue';
import type { Ref } from 'vue';
import {
    createError,
    definePageMeta,
    navigateTo,
    useRoute,
    useToast,
} from '#imports';
import { LayoutKey } from '../../config/layout';
import { updateObjectProperties } from '../../utils';

export default defineComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.IDENTITY_PROVIDER_UPDATE,
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
            entity.value = await injectHTTPClient()
                .identityProvider
                .getOne(route.params.id as string);
        } catch (e) {
            await navigateTo({ path: '/identity-providers' });
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
                :path="'/identity-providers/'+entity.id"
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
