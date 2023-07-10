<script lang="ts">

import { IdentityProviderRoleAssignmentList } from '@authup/client-vue';
import type { IdentityProvider } from '@authup/core';
import { PermissionName } from '@authup/core';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        IdentityProviderRoleAssignmentList,
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

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            entity: props.entity,
            handleFailed,
        };
    },
});
</script>
<template>
    <IdentityProviderRoleAssignmentList
        :entity-id="entity.id"
        @failed="handleFailed"
    />
</template>
