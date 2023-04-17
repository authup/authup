<script lang="ts">
import { OAuth2ProviderForm } from '@authup/client-vue';
import type { IdentityProvider } from '@authup/core';
import { IdentityProviderProtocol, PermissionName } from '@authup/core';
import { FormSelect } from '@vue-layout/form-controls';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../../../../config/layout';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        FormSelect,
        OAuth2ProviderForm,
    },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_ADD,
            ],
        });

        const handleCreated = (e: IdentityProvider) => {
            navigateTo({ path: `/admin/identity-providers/${e.id}` });
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const protocol = ref<null | `${IdentityProviderProtocol}`>(null);

        const options = [
            { id: IdentityProviderProtocol.OAUTH2, value: 'OAuth2' },
            { id: IdentityProviderProtocol.OIDC, value: 'OIDC' },
            { id: IdentityProviderProtocol.LDAP, value: 'LDAP' },
        ];

        const store = useAuthStore();
        const { realmManagementId } = storeToRefs(store);

        return {
            options,
            protocol,
            realmManagementId,
            handleCreated,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <FormSelect
            v-model="protocol"
            :options="options"
            :label="true"
            :label-content="'Protocol'"
        />
        <template v-if="protocol === 'oauth2'">
            <OAuth2ProviderForm
                :realm-id="realmManagementId"
                @created="handleCreated"
                @failed="handleFailed"
            />
        </template>
    </div>
</template>
