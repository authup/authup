<script lang="ts">
import { injectHTTPClient, useStore } from '@authup/client-web-kit';
import type { Scope } from '@authup/core-kit';
import {
    PermissionName, isRealmResourceWritable,
} from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import type { Ref } from 'vue';
import {
    definePageMeta,
    updateObjectProperties,
    useToast,
} from '#imports';
import {
    createError, defineNuxtComponent, navigateTo, useRoute,
} from '#app';
import { LayoutKey, LayoutNavigationID } from '~/config/layout';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SCOPE_EDIT,
            ],
        });

        const items = [
            {
                name: 'General', icon: 'fas fa-bars', urlSuffix: '',
            },
            {
                name: 'Clients', icon: 'fa-solid fa-ghost', urlSuffix: '/clients',
            },
        ];

        const toast = useToast();

        const route = useRoute();

        const entity: Ref<Scope> = ref(null) as any;

        try {
            entity.value = await injectHTTPClient()
                .scope
                .getOne(route.params.id as string);
        } catch (e) {
            await navigateTo({ path: '/admin/scopes' });
            throw createError({});
        }

        const store = useStore();
        const { realm } = storeToRefs(store);
        if (!isRealmResourceWritable(realm.value, entity.value.realm_id)) {
            await navigateTo({ path: '/admin/scopes' });
            throw createError({});
        }

        const handleUpdated = (e: Scope) => {
            if (toast) {
                toast.show({ variant: 'success', body: 'The scope was successfully updated.' });
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
            <i class="fa-solid fa-meteor me-1" /> {{ entity.name }}
            <span class="sub-title ms-1">Details</span>
        </h1>
        <div class="mb-2">
            <DomainEntityNav
                :path="'/admin/scopes/'+entity.id"
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
