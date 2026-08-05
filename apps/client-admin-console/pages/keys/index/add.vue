<script lang="ts">
import { AKeyForm, injectStore } from '@authup/client-web-kit';
import type { Key } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: { AKeyForm },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.KEY_CREATE,
            ],
        });

        const handleCreated = (e: Key) => {
            navigateTo({ path: `/keys/${e.id}` });
        };
        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        return {
            realmManagementId,
            handleCreated,
            handleFailed,
        };
    },
});
</script>
<template>
    <AKeyForm
        :realm-id="realmManagementId"
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
