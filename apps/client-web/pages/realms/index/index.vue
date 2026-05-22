<script lang="ts">
import { VCTimeago } from '@vuecs/timeago';
import type { Realm } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    AEntityDelete,
    APagination,
    ARealms,
    ASearch,
    ATable,
    ATitle,
    injectStore,
    usePermissionCheck,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { TableColumn } from '@vuecs/table';
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        ATable,
        ATitle,
        APagination,
        ASearch,
        AEntityDelete,
        ARealms,
        VCTimeago,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const handleDeleted = (e: Realm) => {
            emit('deleted', e);
        };

        const hasEditPermission = usePermissionCheck({ name: PermissionName.REALM_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.REALM_DELETE });

        const fields: TableColumn<Realm>[] = [
            {
                key: 'name',
                label: 'Name',
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'updated_at',
                label: 'Updated At',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'created_at',
                label: 'Created At',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ];

        return {
            fields,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            realmManagementId,
            setRealmManagement: store.setRealmManagement,
        };
    },
});
</script>
<template>
    <ARealms
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
            <ATable
                :items="props.data"
                :fields="fields"
                :busy="props.busy"
                bordered
            >
                <template #cell-created_at="{ row }">
                    <VCTimeago :datetime="row.created_at" />
                </template>
                <template #cell-updated_at="{ row }">
                    <VCTimeago :datetime="row.updated_at" />
                </template>
                <template #cell-options="{ row }">
                    <button
                        v-if="realmManagementId !== row.id"
                        class="btn btn-xs btn-primary me-1"
                        @click.prevent="setRealmManagement(row)"
                    >
                        <i class="fa-solid fa-check" />
                    </button>
                    <NuxtLink
                        :to="'/realms/'+ row.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="row.id"
                        entity-type="realm"
                        :with-text="false"
                        :disabled="row.built_in || !hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </ATable>
        </template>
    </ARealms>
</template>
