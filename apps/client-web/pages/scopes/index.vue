<script lang="ts">

import type { Scope } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { definePageMeta, useToast } from '#imports';
import { defineNuxtComponent } from '#app';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SCOPE_READ,
                PermissionName.SCOPE_UPDATE,
                PermissionName.SCOPE_DELETE,
                PermissionName.SCOPE_CREATE,
            ],
        });

        const toast = useToast();

        const items = [
            {
                name: 'overview',
                icon: 'fa6-solid:bars',
                url: '/scopes',
            },
            {
                name: 'add',
                icon: 'fa6-solid:plus',
                url: '/scopes/add',
            },
        ];

        const handleDeleted = (e: Scope) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: `The client ${e.name} was successfully deleted.`, 
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
                name="fa6-solid:meteor"
                class="me-1"
            /> Scope
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
