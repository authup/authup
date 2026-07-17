<script lang="ts">
import { ATrustAnchorForm, injectStore } from '@authup/client-web-kit';
import type { TrustAnchor } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: { ATrustAnchorForm },
    emits: ['failed'],
    setup(_props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.KEY_CREATE],
        });

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        return {
            realmManagementId,
            handleCreated: (entity: TrustAnchor) => navigateTo({ path: `/trust-anchors/${entity.id}` }),
            handleFailed: (e: Error) => emit('failed', e),
        };
    },
});
</script>

<template>
    <ATrustAnchorForm
        :realm-id="realmManagementId"
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
