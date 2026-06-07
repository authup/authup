<script lang="ts">
import { injectHTTPClient } from '@authup/client-web-kit';
import type { Robot } from '@authup/core-kit';
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
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_ROLE_CREATE,
                PermissionName.ROBOT_ROLE_UPDATE,
                PermissionName.ROBOT_ROLE_DELETE,
            ],
        });

        const toast = useToast();
        const route = useRoute();

        const entity = ref<Robot>(null!);

        try {
            entity.value = await injectHTTPClient()
                .robot
                .getOne(route.params.id as string, { fields: ['+secret'] });
        } catch {
            await navigateTo({ path: '/robots' });
            createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/robots',
            },
            {
                name: 'General',
                icon: 'fa6-solid:bars',
                url: `/robots/${entity.value.id}`,
            },
            {
                name: 'Permissions',
                icon: 'fa6-solid:user-secret',
                url: `/robots/${entity.value.id}/permissions`,
            },
            {
                name: 'Roles',
                icon: 'fa6-solid:user-group',
                url: `/robots/${entity.value.id}/roles`,
            },
        ]);

        const handleUpdated = (e: Robot) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: 'The robot was successfully updated.', 
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
                name="fa6-solid:robot"
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
