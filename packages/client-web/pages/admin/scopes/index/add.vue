<script lang="ts">
import { AScopeForm, injectStore } from '@authup/client-web-kit';
import type { Scope } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../../../config/layout';

export default defineNuxtComponent({
    components: {
        AScopeForm,
    },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.ROBOT_CREATE,
            ],
        });

        const handleCreated = (e: Scope) => {
            navigateTo({ path: `/admin/scopes/${e.id}` });
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
    <AScopeForm
        :realm-id="realmManagementId"
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
