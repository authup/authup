<script lang="ts">
import { injectHTTPClient } from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { type Ref, defineComponent } from 'vue';
import { ref } from 'vue';
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
            {
                name: 'Permissions', icon: 'fas fa-user-secret', urlSuffix: '/permissions',
            },
            {
                name: 'Roles', icon: 'fa-solid fa-user-group', urlSuffix: '/roles',
            },
        ];

        const toast = useToast();
        const route = useRoute();

        const entity: Ref<Client> = ref(null) as any;

        try {
            entity.value = await injectHTTPClient()
                .client
                .getOne(route.params.id as string, { fields: ['+secret'] });
        } catch (e) {
            await navigateTo({ path: '/clients' });
            throw createError({});
        }

        const handleUpdated = (e: Client) => {
            if (toast) {
                toast.show({ variant: 'success', body: 'The client was successfully updated.' });
            }

            extendObject(entity, e);
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
                :path="'/clients/'+entity.id"
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
