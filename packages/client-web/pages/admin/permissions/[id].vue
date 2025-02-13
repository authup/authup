<script lang="ts">
import { injectHTTPClient, injectStore } from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineComponent, ref } from 'vue';
import type { Ref } from 'vue';
import {
    definePageMeta,
    updateObjectProperties,
    useToast,
} from '#imports';
import {
    createError, navigateTo, useRoute,
} from '#app';
import { LayoutKey } from '~/config/layout';

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
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Users', icon: 'fas fa-user', urlSuffix: 'users',
            },
            {
                name: 'Clients', icon: 'fa-solid fa-ghost ', urlSuffix: 'clients',
            },
            {
                name: 'Robots', icon: 'fas fa-robot', urlSuffix: 'robots',
            },
            {
                name: 'Roles', icon: 'fas fa-user-group', urlSuffix: 'roles',
            },
        ];

        const toast = useToast();
        const store = injectStore();
        const route = useRoute();

        const entity : Ref<Permission> = ref(null) as any;

        try {
            entity.value = await injectHTTPClient()
                .permission
                .getOne(route.params.id as string);
        } catch (e) {
            await navigateTo({ path: '/admin/permissions' });
            throw createError({});
        }

        const { realm } = storeToRefs(store);

        if (!isRealmResourceWritable(realm.value, entity.value.realm_id)) {
            await navigateTo({ path: '/admin/permissions' });
            throw createError({});
        }

        const handleUpdated = (e: Permission) => {
            if (toast) {
                toast.show({ variant: 'success', body: 'The permission was successfully updated.' });
            }

            updateObjectProperties(entity, e);
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({ variant: 'warning', body: e.message });
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
            <i class="fa fa-user me-1" />
            {{ entity.name }}
            <span class="sub-title ms-1">
                Details
            </span>
        </h1>
        <div class="mb-2">
            <DomainEntityNav
                :items="items"
                :path="`/admin/permissions/${entity.id}`"
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
