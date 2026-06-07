<script lang="ts">
import type { User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { definePageMeta, useToast } from '#imports';
import { defineNuxtComponent } from '#app';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.USER_READ,
                PermissionName.USER_UPDATE,
                PermissionName.USER_CREATE,
                PermissionName.USER_DELETE,
            ],
        });

        const toast = useToast();

        const items = [
            {
                name: 'overview',
                icon: 'fa6-solid:bars',
                url: '/users',
            },
            {
                name: 'add',
                icon: 'fa6-solid:plus',
                url: '/users/add',
            },
        ];

        const handleDeleted = (e: User) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: `The user ${e.name} was successfully deleted.`, 
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
            items,
            handleFailed,
            handleDeleted,
        };
    },
});
</script>
<template>
    <div>
        <h1 class="title no-border mb-3">
            <VCIcon
                name="fa6-solid:user"
                class="me-1"
            /> User
            <span class="sub-title ms-1">
                Management
            </span>
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
