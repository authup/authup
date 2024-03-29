<script lang="ts">

import { BTable } from 'bootstrap-vue-next';
import type { Scope } from '@authup/core';
import {
    PermissionName, isRealmResourceWritable,
} from '@authup/core';
import {
    AEntityDelete, APagination, AScopes, ASearch, ATitle,
} from '@authup/client-vue';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent, resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        BTable,
        AScopes,
        AEntityDelete,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
        const list = resolveComponent('ScopeList');

        const handleDeleted = (e: Scope) => {
            emit('deleted', e);
        };

        const store = useAuthStore();
        const { realm, realmManagementId } = storeToRefs(store);

        const query : BuildInput<Scope> = {
            filter: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const isResourceWritable = (
            resource: Scope,
        ) => isRealmResourceWritable(realm.value, resource.realm_id);

        const hasEditPermission = store.has(PermissionName.SCOPE_EDIT);
        const hasDropPermission = store.has(PermissionName.SCOPE_DROP);

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
    <AScopes
        :query="query"
        @deleted="handleDeleted"
    >
        <template #header="props">
            <ATitle />
            <ASearch
                :load="props.load"
                :busy="props.busy"
            />
        </template>
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
        <template #body="props">
            <BTable
                :items="props.data"
                :fields="fields"
                :busy="props.busy"
                head-variant="'dark'"
                outlined
            >
                <template #cell(created_at)="data">
                    <VCTimeago :datetime="data.item.created_at" />
                </template>
                <template #cell(updated_at)="data">
                    <VCTimeago :datetime="data.item.created_at" />
                </template>
                <template #cell(options)="data">
                    <NuxtLink
                        :to="'/admin/scopes/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission || !isResourceWritable(data.item)"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="scope"
                        :with-text="false"
                        :disabled="data.item.built_in || !hasDropPermission || !isResourceWritable(data.item)"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </AScopes>
</template>
