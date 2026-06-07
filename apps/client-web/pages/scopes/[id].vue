<script lang="ts">
import { injectHTTPClient } from '@authup/client-web-kit';
import type { Scope } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { computed, defineComponent, ref } from 'vue';
import {
    definePageMeta,
    useToast,
} from '#imports';
import { createError, navigateTo, useRoute } from '#app';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SCOPE_UPDATE,
            ],
        });

        const toast = useToast();
        const route = useRoute();

        const entity = ref<Scope>(null!);

        try {
            entity.value = await injectHTTPClient()
                .scope
                .getOne(route.params.id as string);
        } catch {
            await navigateTo({ path: '/scopes' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/scopes',
            },
            {
                name: 'General',
                icon: 'fa6-solid:bars',
                url: `/scopes/${entity.value.id}`,
            },
            {
                name: 'Clients',
                icon: 'fa6-solid:ghost',
                url: `/scopes/${entity.value.id}/clients`,
            },
        ]);

        const handleUpdated = (e: Scope) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: 'The scope was successfully updated.', 
                });
            }

            extendObject(entity.value, e);
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({
                    variant: 'warning',
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
                name="fa6-solid:meteor"
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
