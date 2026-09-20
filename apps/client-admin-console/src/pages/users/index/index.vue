<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import type { ListLoadFn } from '@authup/client-web-kit';
import {
    AEntityDelete,
    APagination,
    ASearch,
    ATitle,
    AUsers,
    injectStore,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import type { FormOption } from '@vuecs/forms';
import { VCFormSelect } from '@vuecs/forms';
import { VCAlert } from '@vuecs/elements';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import type { TableColumn } from '@vuecs/table';
import {
    computed,
    defineComponent,
    ref,
    watch,
} from 'vue';
import { reloadCollection, usePathScope } from '../../../composables/path-scope';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        AUsers,
        AEntityDelete,
        VCAlert,
        VCButton,
        VCFormSelect,
        VCIcon,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const handleDeleted = (e: User) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        // The folder COLUMN is ungated: the `path` relation is deliberately
        // ungated server-side (a folder row is organizational metadata, so a
        // reader of the row may see where it is filed), and the column is the
        // rationale that was granted for. What PATH_READ gates is the folder
        // SELECT and the request behind it, since `GET /paths` IS gated.
        const hasPathReadPermission = usePermissionCheck({ name: PermissionName.PATH_READ });

        const pathScope = usePathScope({
            realmId: realmManagementId,
            enabled: hasPathReadPermission,
        });

        const query = computed(() => defineQuery<User>({
            filters: {
                realmId: [realmManagementId.value ?? null, null],
                ...pathScope.filters.value,
            },
            relations: ['path'],
        }));

        // The collection reads its base query on every load but does not
        // watch the prop, so a folder resolved after mount needs the list
        // reloaded. Both the control below and a `?path=` deep link land
        // here. A scope still resolving is skipped, so the list is not
        // emptied and refilled on every selection, and a deep link's
        // initial load is held back until the first resolution settles;
        // `reloadCollection` covers a list that is busy when one lands.
        const collection = ref<{ load: ListLoadFn, data: User[] } | null>(null);
        watch(pathScope.filters, () => {
            if (pathScope.pending.value) {
                return;
            }

            reloadCollection(() => collection.value);
        });

        const hasEditPermission = usePermissionCheck({ name: PermissionName.USER_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.USER_DELETE });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PATH,
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
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.PATH_SCOPE,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.PATH_SCOPE_ALL,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.PATH_SCOPE_TRUNCATED,
            },
        ]);

        // ponytail: a flat select of the realm's folders. The
        // Authentik-style tree pane replaces it once VCTree ships
        // (tada5hi/vuecs#1729); `usePathScope` is the piece it reuses.
        const pathScopeOptions = computed<FormOption[]>(() => [
            { value: '', label: translations.pathScopeAll },
            ...pathScope.options.value.map((entry) => ({
                value: entry.path,
                label: entry.path,
            })),
        ]);

        const pathScopeValue = computed<string>({
            get: () => pathScope.path.value ?? '',
            set: (value) => pathScope.select(value.length > 0 ? value : null),
        });

        const columns = computed<TableColumn<User>[]>(() => [
            {
                key: 'name',
                label: translations.name,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'path',
                label: translations.path,
                headerClass: 'text-left',
                cellClass: 'text-left',
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

        return {
            collection,
            columns,
            hasPathReadPermission,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            pathScopePending: pathScope.pending,
            pathScopeTruncated: pathScope.truncated,
            pathScopeOptions,
            pathScopeValue,
            query,
            translations,
            VCLink,
        };
    },
});
</script>
<template>
    <AUsers
        ref="collection"
        :query="query"
        :body="{tag: 'div'}"
        :footer="true"
        :load-on-setup="!pathScopePending"
        @deleted="handleDeleted"
    >
        <template #header="props">
            <ATitle />
            <div class="flex flex-wrap items-center gap-2">
                <div
                    v-if="hasPathReadPermission"
                    class="w-full sm:w-64"
                >
                    <VCFormSelect
                        v-model="pathScopeValue"
                        :options="pathScopeOptions"
                        :aria-label="translations.pathScope"
                    />
                </div>
                <div class="grow">
                    <ASearch
                        :load="props.load"
                        :busy="props.busy"
                    />
                </div>
            </div>
            <VCAlert
                v-if="pathScopeTruncated"
                color="warning"
                variant="soft"
                class="mt-2"
            >
                {{ translations.pathScopeTruncated }}
            </VCAlert>
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
                <template #cell-path="{ row }">
                    {{ row.path?.path ?? '' }}
                </template>
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-updatedAt="{ row }">
                    <VCTimeago :datetime="row.updatedAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="VCLink"
                        :to="hasEditPermission ? `/users/${row.id}` : undefined"
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
                        entity-type="user"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </AUsers>
</template>
