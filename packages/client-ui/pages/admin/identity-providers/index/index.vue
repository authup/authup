<script lang="ts">

import { BTable } from 'bootstrap-vue-next';
import type { IdentityProvider } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { EntityDelete, IdentityProviderList } from '@authup/client-vue';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#app';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: { BTable, IdentityProviderList, EntityDelete },
    emits: ['deleted'],
    setup(props, { emit }) {
        const handleDeleted = (e: IdentityProvider) => {
            emit('deleted', e);
        };

        const store = useAuthStore();
        const { realm, realmManagementId } = storeToRefs(store);

        const query : BuildInput<IdentityProvider> = {
            filter: {
                realm_id: [realmManagementId.value, null],
            },
        };

        const isResourceWritable = (
            resource: IdentityProvider,
        ) => isRealmResourceWritable(realm.value, resource.realm_id);

        const hasEditPermission = store.has(PermissionName.PROVIDER_EDIT);
        const hasDropPermission = store.has(PermissionName.PROVIDER_DROP);

        const fields = [
            {
                key: 'id', label: 'ID', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'name', label: 'Name', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'created_at', label: 'Created At', thClass: 'text-center', tdClass: 'text-center',
            },
            {
                key: 'updated_at', label: 'Updated At', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'options', label: '', tdClass: 'text-left',
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
    <IdentityProviderList
        :header-title="{ icon: 'fa-solid fa-list pe-1', content: 'Overview' }"
        :query="query"
        @deleted="handleDeleted"
    >
        <template #items="props">
            <BTable
                :items="props.data"
                :fields="fields"
                :busy="props.busy"
                head-variant="'dark'"
                outlined
            >
                <template #cell(options)="data">
                    <NuxtLink
                        :to="'/admin/identity-providers/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission || !isResourceWritable(data.item)"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <EntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="identityProvider"
                        :with-text="false"
                        :disabled="!hasDropPermission || !isResourceWritable(data.item)"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </IdentityProviderList>
</template>
