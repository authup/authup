<script lang="ts">

import { injectHTTPClient, useStore } from '@authup/client-web-kit';
import type { Role } from '@authup/core-kit';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineComponent, ref } from 'vue';
import type { Ref } from 'vue';
import {
    definePageMeta,
    useToast,
} from '#imports';
import {
    createError, navigateTo, useRoute,
} from '#app';
import { LayoutKey } from '~/config/layout';
import { updateObjectProperties } from '../../../utils';

export default defineComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.ROLE_UPDATE,
                PermissionName.USER_ROLE_CREATE,
                PermissionName.USER_ROLE_UPDATE,
                PermissionName.USER_ROLE_DELETE,
            ],
        });

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Permissions', icon: 'fas fa-user-secret', urlSuffix: 'permissions',
            },
            {
                name: 'Users', icon: 'fas fa-users', urlSuffix: 'users',
            },
        ];

        const toast = useToast();
        const store = useStore();
        const route = useRoute();

        const entity : Ref<Role> = ref(null) as any;

        try {
            entity.value = await injectHTTPClient()
                .role
                .getOne(route.params.id as string);
        } catch (e) {
            await navigateTo({ path: '/admin/roles' });
            throw createError({});
        }

        const { realm } = storeToRefs(store);

        if (!isRealmResourceWritable(realm.value, entity.value.realm_id)) {
            await navigateTo({ path: '/admin/roles' });
            throw createError({});
        }

        const handleUpdated = (e: Role) => {
            if (toast) {
                toast.show({ variant: 'success', body: 'The role was successfully updated.' });
            }

            updateObjectProperties(entity, e);
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({ variant: 'warning', body: e.message });
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
            <i class="fa-solid fa-theater-masks me-1" /> {{ entity.name }}
            <span class="sub-title ms-1">Details</span>
        </h1>
        <div class="mb-2">
            <DomainEntityNav
                :path="'/admin/roles/'+entity.id"
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
