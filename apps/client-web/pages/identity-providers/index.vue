<script lang="ts">

import type { IdentityProvider } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { definePageMeta, useToast } from '#imports';
import { defineNuxtComponent } from '#app';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.IDENTITY_PROVIDER_READ,
                PermissionName.IDENTITY_PROVIDER_UPDATE,
                PermissionName.IDENTITY_PROVIDER_DELETE,
                PermissionName.IDENTITY_PROVIDER_CREATE,
            ],
        });

        const toast = useToast();

        const items = [
            {
                name: 'overview',
                icon: 'fa6-solid:bars',
                url: '/identity-providers',
            },
            {
                name: 'add',
                icon: 'fa6-solid:plus',
                url: '/identity-providers/add',
            },
        ];

        const handleDeleted = (e: IdentityProvider) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: `The identity-provider ${e.name} was successfully deleted.`, 
                });
            }
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({
                    variant: 'warning',
                    body: e.message, 
                });
            }
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
            <VCIcon
                name="fa6-solid:atom"
                class="me-1"
            /> Identity Providers
            <span class="sub-title ms-1">Management</span>
        </h1>
        <div class="content-wrapper">
            <div class="content-sidebar flex-col">
                <VCNavItems
                    :data="items"
                    variant="pills"
                    orientation="vertical"
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
