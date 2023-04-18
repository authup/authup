<script lang="ts">
import type { Client, Realm } from '@authup/core';
import { PermissionName, isRealmResourceWritable } from '@authup/core';
import { EntityDelete, RealmList } from '@authup/client-vue';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent } from '#app';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        EntityDelete: EntityDelete,
        RealmList,
    },
    emits: ['deleted'],
    setup(props, { emit }) {
        const store = useAuthStore();
        const {
            realm,
            realmManagementId,
        } = storeToRefs(store);

        const handleDeleted = (e: Realm) => {
            emit('deleted', e);
        };

        const isResourceWritable = (
            entity: Realm,
        ) => isRealmResourceWritable(realm.value, entity.id);

        const hasEditPermission = store.has(PermissionName.REALM_EDIT);
        const hasDropPermission = store.has(PermissionName.REALM_DROP);

        return {
            isResourceWritable,
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
    <RealmList
        :header-title="{ icon: 'fa-solid fa-list pe-1', content: 'Overview' }"
        @deleted="handleDeleted"
    >
        <template #item-actions="props">
            <template v-if="isResourceWritable(props.data)">
                <button
                    v-if="realmManagementId !== props.data.id"
                    class="btn btn-xs btn-primary me-1"
                    @click.prevent="setRealmManagement(props.data)"
                >
                    <i class="fa-solid fa-check" />
                </button>
                <NuxtLink
                    :to="'/admin/realms/'+ props.data.id"
                    class="btn btn-xs btn-outline-primary me-1"
                    :disabled="!hasEditPermission"
                >
                    <i class="fa-solid fa-bars" />
                </NuxtLink>
                <EntityDelete
                    class="btn btn-xs btn-outline-danger"
                    :entity-id="props.data.id"
                    entity-type="realm"
                    :with-text="false"
                    :disabled="!props.data.drop_able || !hasDropPermission"
                    @deleted="props.deleted"
                />
            </template>
        </template>
    </RealmList>
</template>
