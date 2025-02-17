<script lang="ts">
import { BTable } from 'bootstrap-vue-next';
import type { Robot } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    AEntityDelete, APagination, ARobots, ASearch, ATitle, injectStore, usePermissionCheck,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        BTable,
        ARobots,
        AEntityDelete,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
        const handleDeleted = (e: Robot) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query : BuildInput<Robot> = {
            filter: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const hasEditPermission = usePermissionCheck({ name: PermissionName.ROBOT_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.ROBOT_DELETE });

        const fields = [
            {
                key: 'name', label: 'Name', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'created_at', label: 'Created At', thClass: 'text-center', tdClass: 'text-center',
            },
            {
                key: 'updated_at', label: 'Updated At', thClass: 'text-left', tdClass: 'text-left',
            },
            { key: 'options', label: '', tdClass: 'text-left' },
        ];

        return {
            fields,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            query,
        };
    },
});
</script>
<template>
    <ARobots
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
                        :to="'/robots/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="robot"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </ARobots>
</template>
