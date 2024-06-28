<script lang="ts">
import type { Role } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { definePageMeta, useToast } from '#imports';
import { defineNuxtComponent } from '#app';
import DomainEntityNav from '../../../components/DomainEntityNav';
import { LayoutKey, LayoutNavigationID } from '../../../config/layout';

export default defineNuxtComponent({
    components: {
        DomainEntityNav,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.ADMIN,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
                PermissionName.ROLE_CREATE,
            ],
        });

        const toast = useToast();

        const items = [
            {
                name: 'overview',
                urlSuffix: '',
                icon: 'fa fa-bars',
            },
            {
                name: 'add',
                urlSuffix: '/add',
                icon: 'fa fa-plus',
            },
        ];

        const handleDeleted = (e: Role) => {
            if (toast) {
                toast.show({ variant: 'success', body: `The role ${e.name} was successfully deleted.` });
            }
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({ variant: 'warning', body: e.message });
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
            <i class="fa-solid fa-theater-masks me-1" /> Role
            <span class="sub-title ms-1">Management</span>
        </h1>
        <div class="content-wrapper">
            <div class="content-sidebar flex-column">
                <DomainEntityNav
                    :items="items"
                    path="/admin/roles"
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
