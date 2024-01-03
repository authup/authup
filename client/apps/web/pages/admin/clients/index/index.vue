<script lang="ts">

import { BTable } from 'bootstrap-vue-next';
import { storeToRefs } from 'pinia';
import type { Client } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import {
    AClients, AEntityDelete, AUser, APagination, ASearch, ATitle,
} from '@authup/client-vue';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        ListPagination: APagination,
        ListSearch: ASearch,
        ListTitle: ATitle,
        BTable,
        EntityDelete: AEntityDelete,
        ClientList: AClients,
        UserEntity: AUser,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
        const handleDeleted = (e: Client) => {
            emit('deleted', e);
        };

        const store = useAuthStore();
        const { realm, realmManagementId } = storeToRefs(store);

        const query : BuildInput<Client> = {
            filter: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const isResourceWritable = (
            resource: Client,
        ) => isRealmResourceWritable(realm.value, resource.realm_id);

        const hasEditPermission = store.has(PermissionName.CLIENT_EDIT);
        const hasDropPermission = store.has(PermissionName.CLIENT_DROP);

        const fields = [
            {
                key: 'id', label: 'ID', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'name', label: 'Name', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'user_id', label: 'User', thClass: 'text-center', tdClass: 'text-center',
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
    <ClientList
        :query="query"
        @deleted="handleDeleted"
    >
        <template #header="props">
            <ListTitle />
            <ListSearch
                :load="props.load"
                :busy="props.busy"
            />
        </template>
        <template #footer="props">
            <ListPagination
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
                <template #cell(user_id)="data">
                    <UserEntity :entity-id="data.item.user_id">
                        <template #default="user">
                            {{ user.data.name }}
                        </template>
                        <template #error>
                            -
                        </template>
                    </UserEntity>
                </template>
                <template #cell(options)="data">
                    <NuxtLink
                        :to="'/admin/clients/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission || !isResourceWritable(data.item)"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <EntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="client"
                        :with-text="false"
                        :disabled="!hasDropPermission || !isResourceWritable(data.item)"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </ClientList>
</template>
