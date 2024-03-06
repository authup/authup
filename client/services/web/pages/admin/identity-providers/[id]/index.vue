<script lang="ts">

import { AIdentityProviderLdapForm } from '@authup/client-vue';
import type { IdentityProvider } from '@authup/core';
import { PermissionName } from '@authup/core';
import type { PropType } from 'vue';
import { useRuntimeConfig } from '#app';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        AIdentityProviderLdapForm,
    },
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PROVIDER_EDIT,
            ],
        });

        const handleUpdated = (e: IdentityProvider) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const runtimeConfig = useRuntimeConfig();

        return {
            apiUrl: runtimeConfig.public.apiUrl as string,
            entity: props.entity,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <template v-if="entity.protocol === 'ldap'">
        <AIdentityProviderLdapForm
            :entity="entity"
            :realm-id="entity.realm_id"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </template>
    <template v-else>
        <AIdentityProviderOAuth2Form
            :api-url="apiUrl"
            :entity="entity"
            :realm-id="entity.realm_id"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </template>
</template>
