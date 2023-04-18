<script lang="ts">

import type { Role } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { EntityDelete, RoleList } from '@authup/client-vue';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#app';
import { resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: { RoleList, EntityDelete },
    emits: ['deleted'],
    setup(props, { emit }) {
        const list = resolveComponent('RoleList');

        const handleDeleted = (e: Role) => {
            emit('deleted', e);
        };

        const store = useAuthStore();
        const { realm, realmManagementId } = storeToRefs(store);

        const query : BuildInput<Role> = {
            filter: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const isResourceWritable = (
            resource: Role,
        ) => isRealmResourceWritable(realm.value, resource.realm_id);

        const hasEditPermission = store.has(PermissionName.ROLE_EDIT);
        const hasDropPermission = store.has(PermissionName.ROLE_DROP);

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
    <RoleList
        :header-title="{ icon: 'fa-solid fa-list pe-1', content: 'Overview' }"
        :query="query"
        @deleted="handleDeleted"
    >
        <template #item-actions="props">
            <NuxtLink
                :to="'/admin/roles/'+ props.data.id"
                class="btn btn-xs btn-outline-primary me-1"
                :disabled="!hasEditPermission || !isResourceWritable(props.data)"
            >
                <i class="fa-solid fa-bars" />
            </NuxtLink>
            <EntityDelete
                class="btn btn-xs btn-outline-danger"
                :entity-id="props.data.id"
                entity-type="role"
                :with-text="false"
                :disabled="!hasDropPermission || !isResourceWritable(props.data)"
                @deleted="props.deleted"
            />
        </template>
    </RoleList>
</template>
