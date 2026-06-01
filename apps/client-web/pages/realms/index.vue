<script lang="ts">
import type { Realm } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { definePageMeta, useToast } from '#imports';
import { defineNuxtComponent } from '#app';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_READ,
                PermissionName.REALM_UPDATE,
                PermissionName.REALM_DELETE,
                PermissionName.REALM_CREATE,
            ],
        });

        const items = [
            {
                name: 'overview',
                urlSuffix: '',
                icon: 'fa6-solid:bars',
            },
            {
                name: 'add',
                urlSuffix: '/add',
                icon: 'fa6-solid:plus',
            },
        ];

        const handleDeleted = (e: Realm) => {
            const toast = useToast();
            toast.show({
                variant: 'success',
                body: `The realm ${e.name} was successfully deleted.`, 
            });
        };

        const handleFailed = (e: Error) => {
            const toast = useToast();
            toast.show({
                variant: 'warning',
                body: e.message, 
            });
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
                name="fa6-solid:building"
                class="me-1"
            /> Realm
            <span class="sub-title ms-1">Management</span>
        </h1>
        <div class="content-wrapper">
            <div class="content-sidebar flex-col">
                <DomainEntityNav
                    :items="items"
                    path="/realms"
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
