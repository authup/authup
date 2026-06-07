<script lang="ts">
import { injectHTTPClient } from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
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
                PermissionName.PERMISSION_UPDATE,
            ],
        });

        const toast = useToast();
        const route = useRoute();

        const entity = ref<Permission>(null!);

        try {
            entity.value = await injectHTTPClient()
                .permission
                .getOne(route.params.id as string);
        } catch {
            await navigateTo({ path: '/permissions' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/permissions',
            },
            {
                name: 'General',
                icon: 'fa6-solid:bars',
                url: `/permissions/${entity.value.id}`,
            },
            {
                name: 'Policies',
                icon: 'fa6-solid:shield-halved',
                url: `/permissions/${entity.value.id}/policies`,
            },
            {
                name: 'Users',
                icon: 'fa6-solid:user',
                url: `/permissions/${entity.value.id}/users`,
            },
            {
                name: 'Clients',
                icon: 'fa6-solid:ghost',
                url: `/permissions/${entity.value.id}/clients`,
            },
            {
                name: 'Robots',
                icon: 'fa6-solid:robot',
                url: `/permissions/${entity.value.id}/robots`,
            },
            {
                name: 'Roles',
                icon: 'fa6-solid:user-group',
                url: `/permissions/${entity.value.id}/roles`,
            },
        ]);

        const handleUpdated = (e: Permission) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: 'The permission was successfully updated.', 
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
            items,
            entity,
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
                name="fa6-solid:user"
                class="me-1"
            />
            {{ entity.name }}
            <span class="sub-title ms-1">
                Details
            </span>
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
