<script lang="ts">

import { defineComponent } from 'vue';
import { VCTimeago } from '@vuecs/timeago';
import { BTable } from 'bootstrap-vue-next';
import {
    AEntityDelete, APagination, APolicies, ASearch, ATitle, injectStore, usePermissionCheck,
} from '@authup/client-web-kit';
import type { Policy } from '@authup/core-kit';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        BTable,
        AEntityDelete,
        APolicies,
        VCTimeago,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
        const handleDeleted = (e: Policy) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realm, realmManagementId } = storeToRefs(store);

        const query : BuildInput<Policy> = {
            filters: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const isResourceWritable = (
            resource: Policy,
        ) => isRealmResourceWritable(realm.value, resource.realm_id);

        const hasEditPermission = usePermissionCheck({ name: PermissionName.PERMISSION_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.PERMISSION_DELETE });

        const fields = [
            {
                key: 'name', label: 'Name', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'type', label: 'Type', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'created_at', label: 'Created at', thClass: 'text-center', tdClass: 'text-center',
            },
            {
                key: 'updated_at', label: 'Updated at', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'options',
                label: '',
                tdClass: 'text-left',
            },
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
    <APolicies
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
                        :to="'/admin/policies/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission || !isResourceWritable(data.item)"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="policy"
                        :with-text="false"
                        :disabled="data.item.built_in || !hasDropPermission || !isResourceWritable(data.item)"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </APolicies>
</template>
