<script lang="ts">
import { VCTimeago } from '@vuecs/timeago';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { Realm } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    AEntityDelete,
    APagination,
    ARealms,
    ASearch,
    ATitle,
    injectStore,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { storeToRefs } from 'pinia';
import type { TableColumn } from '@vuecs/table';
import { defineComponent, resolveComponent } from 'vue';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        AEntityDelete,
        ARealms,
        VCTimeago,
        VCButton,
        VCIcon,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const handleDeleted = (e: Realm) => {
            emit('deleted', e);
        };

        const hasEditPermission = usePermissionCheck({ name: PermissionName.REALM_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.REALM_DELETE });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.SET_MANAGEMENT_REALM,
            },
        ]);

        const columns: TableColumn<Realm>[] = [
            {
                key: 'name',
                label: 'Name',
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'updatedAt',
                label: 'Updated At',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'createdAt',
                label: 'Created At',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ];

        const NuxtLink = resolveComponent('NuxtLink');

        return {
            columns,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            realmManagementId,
            setRealmManagement: store.setRealmManagement,
            translations,
            NuxtLink,
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
            <VCTable
                :data="props.data"
                :columns="columns"
                :busy="props.busy"
            >
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-updatedAt="{ row }">
                    <VCTimeago :datetime="row.updatedAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        v-if="realmManagementId !== row.id"
                        :aria-label="translations.setManagementRealm"
                        :title="translations.setManagementRealm"
                        size="sm"
                        color="primary"
                        class="me-1 border border-transparent"
                        @click.prevent="setRealmManagement(row)"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:check" />
                        </template>
                    </VCButton>
                    <VCButton
                        :as="NuxtLink"
                        :to="'/realms/'+ row.id"
                        :aria-label="translations.details"
                        :title="translations.details"
                        size="sm"
                        color="primary"
                        variant="outline"
                        class="me-1"
                        :disabled="!hasEditPermission"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:bars" />
                        </template>
                    </VCButton>
                    <AEntityDelete
                        :entity-id="row.id"
                        entity-type="realm"
                        :with-text="false"
                        :disabled="row.builtIn || !hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </ARealms>
</template>
