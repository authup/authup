<script lang="ts">
import { AIdentityProviderForm, injectStore } from '@authup/client-web-kit';
import type { IdentityProvider } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../../../config/layout';

export default defineNuxtComponent({
    components: {
        AIdentityProviderForm,
    },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.IDENTITY_PROVIDER_CREATE,
            ],
        });

        const handleCreated = (e: IdentityProvider) => {
            navigateTo({ path: `/admin/identity-providers/${e.id}` });
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
    <div>
        <AIdentityProviderForm
            @created="handleCreated"
            @failed="handleFailed"
        />
    </div>
</template>
