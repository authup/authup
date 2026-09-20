<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { Path } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    APaths,
    ASearch,
    ATitle,
    injectStore,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import type { TableColumn } from '@vuecs/table';
import { VCTimeago } from '@vuecs/timeago';
import { computed, defineComponent } from 'vue';
import { useRoute } from 'vue-router';
import { PATH_SCOPE_QUERY_KEY, buildPathCollectionFilters, readPathScopeQuery } from '../../../composables/path-scope';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        APaths,
        ASearch,
        AEntityDelete,
        VCButton,
        VCIcon,
        VCTimeago,
    },
    emits: ['deleted', 'failed'],
    setup(_props, { emit }) {
        const handleDeleted = (e: Path) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        // A record's breadcrumb links an ancestor segment to
        // `/paths?path=<prefix>`, so the collection narrows to that subtree
        // when the route names one. Without it the realm's whole tree is
        // listed. The page has no control that rewrites the parameter, so
        // the value is read once per mount and needs no reload watcher; the
        // section crumb (`/paths`, no query) is what clears the narrowing.
        const route = useRoute();
        const query = computed(() => defineQuery<Path>({
            filters: buildPathCollectionFilters(
                readPathScopeQuery(route.query[PATH_SCOPE_QUERY_KEY]),
                realmManagementId.value ?? null,
            ),
            sorts: ['path'],
        }));

        const hasEditPermission = usePermissionCheck({ name: PermissionName.PATH_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.PATH_DELETE });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PATH,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.DISPLAY_NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CREATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
        ]);

        const columns = computed<TableColumn<Path>[]>(() => [
            {
                key: 'path',
                label: translations.path,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'displayName',
                label: translations.displayName,
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
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        return {
            columns,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            query,
            translations,
            VCLink,
        };
    },
});
</script>
<template>
    <APaths
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
                <template #cell-displayName="{ row }">
                    {{ row.displayName ?? '' }}
                </template>
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="VCLink"
                        :to="hasEditPermission ? `/paths/${row.id}` : undefined"
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
                        entity-type="path"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </APaths>
</template>
