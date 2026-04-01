<script lang="ts">

import { BTable } from 'bootstrap-vue-next';
import type { Role } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    AEntityDelete, 
    APagination, 
    ARoles, 
    ASearch, 
    ATitle, 
    injectStore, 
    usePermissionCheck,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import type { Component } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        BTable: BTable as Component,
        ARoles,
        AEntityDelete,
    },
    emits: ['deleted'],
    setup(_props, {
        emit 
    }) {
        const handleDeleted = (e: Role) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const {
            realmManagementId 
        } = storeToRefs(store);

        const query : BuildInput<Role> = {
            filter: {
                realm_id: [realmManagementId.value ?? null, null],
            },
        };

        const hasEditPermission = usePermissionCheck({
            name: PermissionName.ROLE_UPDATE 
        });
        const hasDropPermission = usePermissionCheck({
            name: PermissionName.ROLE_DELETE 
        });

        const fields = [
            {
                key: 'name',
                label: 'Name',
                thClass: 'text-left',
                tdClass: 'text-left',
            },
            {
                key: 'built_in',
                label: 'Built in?',
                thClass: 'text-center',
                tdClass: 'text-center',
            },
            {
                key: 'global',
                label: 'Global',
                thClass: 'text-center',
                tdClass: 'text-center',
            },
            {
                key: 'created_at',
                label: 'Created at',
                thClass: 'text-center',
                tdClass: 'text-center',
            },
            {
                key: 'updated_at',
                label: 'Updated at',
                thClass: 'text-left',
                tdClass: 'text-left',
            },
            {
                key: 'options',
                label: '',
                tdClass: 'text-left' 
            },
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
    <ARoles
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
                <template #cell(built_in)="data">
                    <i
                        class="fas"
                        :class="{
                            'fa-check text-success': data.item.built_in,
                            'fa-times text-danger': !data.item.built_in,
                        }"
                    />
                </template>
                <template #cell(global)="data">
                    <i
                        class="fas"
                        :class="{
                            'fa-check text-success': !data.item.realm_id,
                            'fa-times text-danger': data.item.realm_id,
                        }"
                    />
                </template>
                <template #cell(created_at)="data">
                    <VCTimeago :datetime="data.item.created_at" />
                </template>
                <template #cell(updated_at)="data">
                    <VCTimeago :datetime="data.item.created_at" />
                </template>
                <template #cell(options)="data">
                    <NuxtLink
                        :to="'/roles/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="role"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </ARoles>
</template>
