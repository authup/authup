<script lang="ts">
import { injectHTTPClient } from '@authup/client-web-kit';
import type { Scope } from '@authup/core-kit';
import {
    PermissionName,
} from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { defineComponent, ref } from 'vue';
import type { Ref } from 'vue';
import {
    definePageMeta,
    useToast,
} from '#imports';
import {
    createError, navigateTo, useRoute,
} from '#app';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SCOPE_UPDATE,
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
            await navigateTo({ path: '/scopes' });
            throw createError({});
        }

        const handleUpdated = (e: Scope) => {
            if (toast) {
                toast.show({ variant: 'success', body: 'The scope was successfully updated.' });
            }

            extendObject(entity, e);
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
                :path="'/scopes/'+entity.id"
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
