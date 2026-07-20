<script lang="ts">

import { defineQuery } from '@rapiq/core';
import { storeToRefs } from 'pinia';
import type { Client } from '@authup/core-kit';
import { ClientAuthMethod, PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AClients,
    AEntityDelete,
    APagination,
    ASearch,
    ATitle,
    injectStore,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { TableColumn } from '@vuecs/table';
import { computed, defineComponent, resolveComponent } from 'vue';

export default defineComponent({
    components: {
        APagination,
        ASearch,
        ATitle,
        AEntityDelete,
        AClients,
        VCButton,
        VCIcon,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const handleDeleted = (e: Client) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query = defineQuery<Client>({ filters: { realmId: [realmManagementId.value ?? null, null] } });

        const hasEditPermission = usePermissionCheck({ name: PermissionName.CLIENT_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.CLIENT_DELETE });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.ACTIVE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.AUTH_METHOD,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.AUTH_METHOD_NONE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.AUTH_METHOD_SECRET,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.AUTH_METHOD_TLS,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.BUILT_IN,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CREATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.UPDATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
        ]);

        const columns = computed<TableColumn<Client>[]>(() => [
            {
                key: 'name',
                label: translations.name,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'active',
                label: translations.active,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'authMethod',
                label: translations.authMethod,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'builtIn',
                label: translations.builtIn,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'createdAt',
                label: translations.createdAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'updatedAt',
                label: translations.updatedAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        const NuxtLink = resolveComponent('NuxtLink');

        const authMethodLabel = (method: `${ClientAuthMethod}`) => {
            switch (method) {
                case ClientAuthMethod.SECRET:
                    return translations.authMethodSecret;
                case ClientAuthMethod.TLS:
                    return translations.authMethodTls;
                default:
                    return translations.authMethodNone;
            }
        };

        return {
            columns,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            query,
            translations,
            authMethodLabel,
            NuxtLink,
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
            <VCTable
                :data="props.data"
                :columns="columns"
                :busy="props.busy"
            >
                <template #cell-active="{ row }">
                    <VCIcon
                        :name="row.active ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="row.active ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-authMethod="{ row }">
                    {{ authMethodLabel(row.authMethod) }}
                </template>
                <template #cell-builtIn="{ row }">
                    <VCIcon
                        :name="row.builtIn ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="row.builtIn ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-updatedAt="{ row }">
                    <VCTimeago :datetime="row.updatedAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="NuxtLink"
                        :to="'/clients/'+ row.id"
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
                        entity-type="client"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </AClients>
</template>
