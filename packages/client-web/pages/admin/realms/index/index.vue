<script lang="ts">
import { VCTimeago } from '@vuecs/timeago';
import { BTable } from 'bootstrap-vue-next';
import type { Realm } from '@authup/core-kit';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import {
    AEntityDelete, APagination, ARealms, ASearch, ATitle, useAbilityCheck,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { defineNuxtComponent } from '#imports';
import { useAuthStore } from '../../../../store/auth';

export default defineNuxtComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        BTable,
        AEntityDelete,
        ARealms,
        VCTimeago,
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

        const hasEditPermission = useAbilityCheck(PermissionName.REALM_EDIT);
        const hasDropPermission = useAbilityCheck(PermissionName.REALM_DROP);

        const fields = [
            {
                key: 'id', label: 'ID', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'name', label: 'Name', thClass: 'text-left', tdClass: 'text-left',
            },
            {
                key: 'updated_at', label: 'Updated At', thClass: 'text-center', tdClass: 'text-center',
            },
            {
                key: 'created_at', label: 'Created At', thClass: 'text-center', tdClass: 'text-center',
            },
            { key: 'options', label: '', tdClass: 'text-left' },
        ];

        return {
            fields,
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
                    <button
                        v-if="realmManagementId !== data.item.id"
                        class="btn btn-xs btn-primary me-1"
                        @click.prevent="setRealmManagement(data.item)"
                    >
                        <i class="fa-solid fa-check" />
                    </button>
                    <NuxtLink
                        :to="'/admin/realms/'+ data.item.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="data.item.id"
                        entity-type="realm"
                        :with-text="false"
                        :disabled="!data.item.built_in || !hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </BTable>
        </template>
    </ARealms>
</template>
