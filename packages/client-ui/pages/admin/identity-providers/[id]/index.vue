<script lang="ts">

import { OAuth2ProviderForm } from '@authup/client-vue';
import type { IdentityProvider } from '@authup/core';
import { PermissionName } from '@authup/core';
import type { PropType } from 'vue';
import { useNuxtApp } from '#app';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        OAuth2ProviderForm,
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
                PermissionName.REALM_EDIT,
            ],
        });

        const handleUpdated = (e: IdentityProvider) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const app = useNuxtApp();

        return {
            apiUrl: app.$config.public.apiUrl as string,
            entity: props.entity,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <OAuth2ProviderForm
        :api-url="apiUrl"
        :entity="entity"
        :realm-id="entity.realm_id"
        @updated="handleUpdated"
        @failed="handleFailed"
    />
</template>
