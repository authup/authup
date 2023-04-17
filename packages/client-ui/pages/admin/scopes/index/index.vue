<script lang="ts">
import type { Scope } from '@authup/core';
import {
    PermissionName, isRealmResourceWritable,
} from '@authup/core';
import { EntityDelete, ScopeList } from '@authup/client-vue';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import { defineNuxtComponent } from '#app';
import { resolveComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: { ScopeList, EntityDelete },
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
    <ScopeList
        :header-title="{ icon: 'fa-solid fa-list pe-1', content: 'Overview' }"
        :query="query"
        @deleted="handleDeleted"
    >
        <template #item-actions="props">
            <NuxtLink
                :to="'/admin/scopes/'+ props.data.id"
                class="btn btn-xs btn-outline-primary me-1"
                :disabled="!hasEditPermission || !isResourceWritable(props.data)"
            >
                <i class="fa-solid fa-bars" />
            </NuxtLink>
            <EntityDelete
                class="btn btn-xs btn-outline-danger"
                :entity-id="props.data.id"
                entity-type="scope"
                :with-text="false"
                :disabled="props.data.built_in || !hasDropPermission || !isResourceWritable(props.data)"
                @deleted="props.deleted"
            />
        </template>
    </ScopeList>
</template>
