<script lang="ts">

import { Timeago } from '@vue-layout/timeago';
import { BTable } from 'bootstrap-vue-next';
import type { Role } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { EntityDelete, RoleList } from '@authup/client-vue';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#app';
import { resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        BTable, RoleList, EntityDelete, Timeago,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
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

        const fields = [
            {
                key: 'id', label: 'ID', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'name', label: 'Name', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'created_at', label: 'Created at', thClass: 'text-center', tdClass: 'text-center',
            },
            {
                key: 'updated_at', label: 'Updated at', thClass: 'text-left', tdClass: 'text-left',
            },
            { key: 'options', label: '', tdClass: 'text-left' },
        ];

        return {
            fields,
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
        <template #body="props">
            <BTable
                :items="props.data"
                :fields="fields"
                :busy="props.busy"
                head-variant="'dark'"
                outlined
            >
                <template #cell(created_at)="data">
                    <Timeago :datetime="data.item.created_at" />
                </template>
                <template #cell(updated_at)="data">
                    <Timeago :datetime="data.item.created_at" />
                </template>
                <template #cell(options)="data">
                    <NuxtLink
                        :to="'/admin/roles/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission || !isResourceWritable(data.item)"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <EntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="role"
                        :with-text="false"
                        :disabled="!hasDropPermission || !isResourceWritable(data.item)"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </RoleList>
</template>
