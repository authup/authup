<script lang="ts">

import { BTable } from 'bootstrap-vue-next';
import { storeToRefs } from 'pinia';
import type { Client } from '@authup/core-kit';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import {
    AClients, AEntityDelete, APagination, ASearch, ATitle, AUser, injectStore, usePermissionCheck,
} from '@authup/client-web-kit';
import type { BuildInput } from 'rapiq';
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        APagination,
        ASearch,
        ATitle,
        BTable,
        AEntityDelete,
        AClients,
        AUser,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
        const handleDeleted = (e: Client) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realm, realmManagementId } = storeToRefs(store);

        const query : BuildInput<Client> = {
            filters: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const isResourceWritable = (
            resource: Client,
        ) => isRealmResourceWritable(realm.value, resource.realm_id);

        const hasEditPermission = usePermissionCheck({ name: PermissionName.CLIENT_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.CLIENT_DELETE });

        const fields = [
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
    <AClients
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
                <template #cell(user_id)="data">
                    <template v-if="data.item.user_id">
                        <AUser :entity-id="data.item.user_id">
                            <template #default="user">
                                {{ user.data.name }}
                            </template>
                            <template #error>
                                -
                            </template>
                        </AUser>
                    </template>
                    <template v-else>
                        -
                    </template>
                </template>
                <template #cell(options)="data">
                    <NuxtLink
                        :to="'/clients/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission || !isResourceWritable(data.item)"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
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
    </AClients>
</template>
