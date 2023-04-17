<script lang="ts">

import { storeToRefs } from 'pinia';
import type { Client } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { ClientList, EntityDelete } from '@authup/client-vue';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#app';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        EntityDelete,
        ClientList,
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
    <ClientList
        :header-title="{ icon: 'fa-solid fa-list pe-1', content: 'Overview' }"
        :query="query"
        @deleted="handleDeleted"
    >
        <template #item-actions="props">
            <NuxtLink
                :to="'/admin/clients/'+ props.data.id"
                class="btn btn-xs btn-outline-primary me-1"
                :disabled="!hasEditPermission || !isResourceWritable(props.data)"
            >
                <i class="fa-solid fa-bars" />
            </NuxtLink>
            <EntityDelete
                class="btn btn-xs btn-outline-danger"
                :entity-id="props.data.id"
                entity-type="client"
                :with-text="false"
                :disabled="!hasDropPermission || !isResourceWritable(props.data)"
                @deleted="props.deleted"
            />
        </template>
    </ClientList>
</template>
