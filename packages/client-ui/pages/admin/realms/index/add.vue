<script lang="ts">

import { RealmForm } from '@authup/client-vue';
import type { Realm } from '@authup/core';
import { PermissionName } from '@authup/core';
import { defineNuxtComponent, navigateTo } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../../../../config/layout';

export default defineNuxtComponent({
    components: {
        RealmForm,
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

        const handleCreated = (e: Realm) => {
            navigateTo({ path: `/admin/realms/${e.id}` });
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
    <RealmForm
        @created="handleCreated"
        @failed="handleFailed"
    />
</template>
