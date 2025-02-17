<script lang="ts">
import { BTable } from 'bootstrap-vue-next';
import type { Scope } from '@authup/core-kit';
import {
    PermissionName,
} from '@authup/core-kit';
import {
    AEntityDelete, APagination, AScopes, ASearch, ATitle, injectStore, usePermissionCheck,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#imports';

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
        const handleDeleted = (e: Scope) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query : BuildInput<Scope> = {
            filter: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const hasEditPermission = usePermissionCheck({ name: PermissionName.SCOPE_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.SCOPE_DELETE });

        const fields = [
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
                        :to="'/scopes/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="scope"
                        :with-text="false"
                        :disabled="data.item.built_in || !hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </AScopes>
</template>
