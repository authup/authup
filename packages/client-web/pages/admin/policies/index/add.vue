<script lang="ts">
import { APolicyForm } from '@authup/client-web-kit';
import type { Permission, Policy } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey } from '../../../../config/layout';

export default defineNuxtComponent({
    components: {
        APolicyForm,
    },
    emits: ['failed', 'created'],
    setup(props, { emit }) {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PERMISSION_CREATE,
            ],
        });

        const handleCreated = (e: Policy) => {
            navigateTo({ path: `/admin/policies/${e.id}` });
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            handleCreated,
            handleFailed,
        };
    },
});
</script>
<template>
    <APolicyForm
        @failed="handleFailed"
        @created="handleCreated"
    />
</template>
