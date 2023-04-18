<script lang="ts">

import { EntityDelete, PermissionList } from '@authup/client-vue';
import type { Permission } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#app';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        EntityDelete,
        PermissionList,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
        const handleDeleted = (e: Permission) => {
            emit('deleted', e);
        };

        const store = useAuthStore();
        const { realm, realmManagementId } = storeToRefs(store);

        const query : BuildInput<Permission> = {
            filter: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const isResourceWritable = (
            resource: Permission,
        ) => isRealmResourceWritable(realm.value, resource.realm_id);

        const hasEditPermission = store.has(PermissionName.PERMISSION_EDIT);
        const hasDropPermission = store.has(PermissionName.PERMISSION_DROP);

        return {
            isResourceWritable,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            query,
        };
    },
});
</script>
<template>
    <PermissionList
        :header-title="{ icon: 'fa-solid fa-list pe-1', content: 'Overview' }"
        :query="query"
        @deleted="handleDeleted"
    >
        <template #item-actions="props">
            <NuxtLink
                :to="'/admin/permissions/'+ props.data.id"
                class="btn btn-xs btn-outline-primary me-1"
                :disabled="!hasEditPermission || !isResourceWritable(props.data)"
            >
                <i class="fa-solid fa-bars" />
            </NuxtLink>
            <EntityDelete
                class="btn btn-xs btn-outline-danger"
                :entity-id="props.data.id"
                entity-type="permission"
                :with-text="false"
                :disabled="props.data.built_in || !hasDropPermission || !isResourceWritable(props.data)"
                @deleted="props.deleted"
            />
        </template>
    </PermissionList>
</template>
