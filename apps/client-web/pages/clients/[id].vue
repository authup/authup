<script lang="ts">
import { injectHTTPClient } from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { computed, defineComponent, ref } from 'vue';
import {
    createError,
    definePageMeta,
    navigateTo,
    useRoute,
    useToast,
} from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.CLIENT_UPDATE,
            ],
        });

        const toast = useToast();
        const route = useRoute();

        const entity = ref<Client>(null!);

        try {
            entity.value = await injectHTTPClient()
                .client
                .getOne(route.params.id as string, { fields: ['+secret'] });
        } catch {
            await navigateTo({ path: '/clients' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/clients',
            },
            {
                name: 'General',
                icon: 'fa6-solid:bars',
                url: `/clients/${entity.value.id}`,
            },
            {
                name: 'Scopes',
                icon: 'fa6-solid:meteor',
                url: `/clients/${entity.value.id}/scopes`,
            },
            {
                name: 'URL',
                icon: 'fa6-solid:link',
                url: `/clients/${entity.value.id}/url`,
            },
            {
                name: 'Permissions',
                icon: 'fa6-solid:user-secret',
                url: `/clients/${entity.value.id}/permissions`,
            },
            {
                name: 'Roles',
                icon: 'fa6-solid:user-group',
                url: `/clients/${entity.value.id}/roles`,
            },
        ]);

        const handleUpdated = (e: Client) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: 'The client was successfully updated.', 
                });
            }

            extendObject(entity.value, e);
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: e.message, 
                });
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
            <VCIcon
                name="fa6-solid:cube"
                class="me-1"
            /> {{ entity.name }}
            <span class="sub-title ms-1">Details</span>
        </h1>
        <div class="mb-2">
            <VCNavItems
                :data="items"
                variant="pills"
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
