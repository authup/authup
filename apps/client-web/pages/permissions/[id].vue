<script lang="ts">
import { injectHTTPClient } from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { defineComponent, ref } from 'vue';
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

        const items = [
            {
                name: 'General',
                icon: 'fa6-solid:bars',
                urlSuffix: '',
            },
            {
                name: 'Policies',
                icon: 'fa6-solid:shield-halved',
                urlSuffix: 'policies',
            },
            {
                name: 'Users',
                icon: 'fa6-solid:user',
                urlSuffix: 'users',
            },
            {
                name: 'Clients',
                icon: 'fa6-solid:ghost',
                urlSuffix: 'clients',
            },
            {
                name: 'Robots',
                icon: 'fa6-solid:robot',
                urlSuffix: 'robots',
            },
            {
                name: 'Roles',
                icon: 'fa6-solid:user-group',
                urlSuffix: 'roles',
            },
        ];

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
            <DomainEntityNav
                :items="items"
                :path="`/permissions/${entity.id}`"
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
