<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { Key } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    AKeys,
    APagination,
    ASearch,
    ATitle,
    extractErrorContext,
    injectHTTPClient,
    injectStore,
    usePermissionCheck,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { useAlertDialog } from '@vuecs/overlays';
import type { TableColumn } from '@vuecs/table';
import { VCTimeago } from '@vuecs/timeago';
import { computed, defineComponent, resolveComponent } from 'vue';

// VCTable deliberately stays globally registered — its generic component
// signature is not assignable to the Options-API `components: {}` slot
// (see structure.md → Table usage).
export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        AKeys,
        AEntityDelete,
        VCButton,
        VCIcon,
        VCTimeago,
    },
    emits: ['deleted', 'failed'],
    setup(_props, { emit }) {
        const handleDeleted = (e: Key) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query = defineQuery<Key>({ filters: { realmId: [realmManagementId.value ?? null, null] } });

        const hasEditPermission = usePermissionCheck({ name: PermissionName.KEY_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.KEY_DELETE });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.USE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.STATUS,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PRIORITY,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CREATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_TITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.DELETE,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ABORT,
            },
        ]);

        const columns = computed<TableColumn<Key>[]>(() => [
            {
                key: 'name',
                label: translations.name,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'use',
                label: translations.use,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'status',
                label: translations.status,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'priority',
                label: translations.priority,
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
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        const httpClient = injectHTTPClient();
        const confirmDialog = useAlertDialog();
        const translate = useTranslator();

        // deleting a referenced enc key answers 409 + the dependent-blob
        // count — surface a crypto-shred confirmation and retry with force.
        const handleDeleteFailed = async (
            row: Key,
            deletedCb: (item: Key) => void,
            e: Error,
        ) => {
            const ctx = extractErrorContext(e);
            if (ctx.status !== 409 || typeof ctx.data?.references !== 'number') {
                emit('failed', e);
                return;
            }

            const confirmed = await confirmDialog({
                title: translations.keyDeleteForceConfirmTitle,
                description: await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.KEY_DELETE_FORCE_CONFIRM_DESCRIPTION,
                    data: { count: ctx.data.references },
                }),
                confirmLabel: translations.delete,
                cancelLabel: translations.abort,
                tone: 'error',
            });

            if (!confirmed) {
                return;
            }

            try {
                const deleted = await httpClient.key.delete(row.id, { force: true });
                deletedCb({ ...deleted.data, id: row.id });
            } catch (err) {
                emit('failed', err);
            }
        };

        const NuxtLink = resolveComponent('NuxtLink');

        return {
            columns,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            handleDeleteFailed,
            query,
            translations,
            NuxtLink,
        };
    },
});
</script>
<template>
    <AKeys
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
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="NuxtLink"
                        :to="'/keys/'+ row.id"
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
                        entity-type="key"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                        @failed="(e: Error) => handleDeleteFailed(row, props.deleted, e)"
                    />
                </template>
            </VCTable>
        </template>
    </AKeys>
</template>
