<script lang="ts">

import type { IdentityProvider } from '@authup/core';
import { PermissionName } from '@authup/core';
import { useToast } from 'vue-toastification';
import { defineNuxtComponent } from '#app';
import { definePageMeta } from '#imports';
import { LayoutKey, LayoutNavigationID } from '../../../config/layout';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PROVIDER_EDIT,
                PermissionName.PROVIDER_DROP,
                PermissionName.PROVIDER_ADD,
            ],
        });

        const items = [
            {
                name: 'overview',
                urlSuffix: '',
                icon: 'fa fa-bars',
            },
            {
                name: 'add',
                urlSuffix: 'add',
                icon: 'fa fa-plus',
            },
        ];

        const handleDeleted = (e: IdentityProvider) => {
            const toast = useToast();
            toast.success(`The identity-provider ${e.name} was successfully deleted.`);
        };

        const handleFailed = (e: Error) => {
            const toast = useToast();
            toast.warning(e.message);
        };

        return {
            handleDeleted,
            handleFailed,
            items,
        };
    },
});
</script>
<template>
    <div>
        <h1 class="title no-border mb-3">
            <i class="fa-solid fa-atom me-1" /> Identity Providers
            <span class="sub-title ms-1">Management</span>
        </h1>
        <div class="content-wrapper">
            <div class="content-sidebar flex-column">
                <DomainEntityNav
                    :items="items"
                    path="/admin/identity-providers"
                    direction="vertical"
                />
            </div>
            <div class="content-container">
                <NuxtPage
                    @deleted="handleDeleted"
                    @failed="handleFailed"
                />
            </div>
        </div>
    </div>
</template>
