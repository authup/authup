<script lang="ts">
import type { Robot } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { defineComponent } from 'vue';
import { definePageMeta, useToast } from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
                PermissionName.ROBOT_CREATE,
            ],
        });

        const toast = useToast();

        const items = [
            {
                name: 'overview',
                icon: 'fa6-solid:bars',
                url: '/robots',
            },
            {
                name: 'add',
                icon: 'fa6-solid:plus',
                url: '/robots/add',
            },
        ];

        const handleDeleted = (e: Robot) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: `The robot ${e.name} was successfully deleted.`, 
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
                name="fa6-solid:robot"
                class="me-1"
            /> Robot
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
