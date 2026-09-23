<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { Path } from '@authup/core-kit';
import { EntityType, PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    APagination,
    APaths,
    ASearch,
    ATitle,
    injectHTTPClient,
    injectStore,
    usePermissionCheck,
    useTranslation,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { useAlertDialog } from '@vuecs/overlays';
import type { EntityListQueryInput, ListLoadFn } from '@authup/client-web-kit';
import type { TableColumn } from '@vuecs/table';
import { VCTimeago } from '@vuecs/timeago';
import {
    computed,
    defineComponent,
    ref,
    watch,
} from 'vue';
import { useRoute } from 'vue-router';
import { readPathDeleteImpact } from '../../../composables/path-delete';
import {
    PATH_SCOPE_QUERY_KEY,
    buildPathCollectionFilters,
    readPathScopeQuery,
    reloadCollection,
} from '../../../composables/path-scope';
import EntityActivity from '../../../components/stats/EntityActivity.vue';
import type { EntityStatsLoadFn } from '../../../composables/entity-stats';

export default defineComponent({
    components: {
        EntityActivity,
        ATitle,
        APagination,
        APaths,
        ASearch,
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
        const httpClient = injectHTTPClient();
        const loadStats : EntityStatsLoadFn = (input) => httpClient.path.getStats(input);

        // A record's breadcrumb links an ancestor segment to
        // `/paths?path=<prefix>`, so the collection narrows to that subtree
        // when the route names one. Without it the realm's whole tree is
        // listed.
        const route = useRoute();
        const query = computed(() => defineQuery<Path>({
            filters: buildPathCollectionFilters(
                readPathScopeQuery(route.query[PATH_SCOPE_QUERY_KEY]),
                realmManagementId.value ?? null,
            ),
            sorts: ['path'],
        }));

        // The collection reads its base query on every load but does not
        // watch the prop, and vue-router REUSES this page on a query-only
        // navigation, so leaving `?path=` behind (the section crumb, the
        // sidebar entry) would otherwise leave the list narrowed while the
        // URL and the breadcrumb say it is not.
        //
        // Post flush, because a prop only carries its new value once the
        // parent has re-rendered: a pre-flush reload composes the query
        // this page held BEFORE the navigation, which is the very state
        // the reload exists to leave behind.
        const collection = ref<{ load: ListLoadFn<EntityListQueryInput<Path>>, busy: boolean } | null>(null);
        watch(query, () => {
            reloadCollection(() => collection.value);
        }, { flush: 'post' });

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
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.DELETE,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ABORT,
            },
        ]);

        // its own ref rather than another `useTranslations` element: that
        // helper keys its output by the translation KEY, and the entity noun
        // and the field label are both `path`
        const entityLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: EntityType.PATH,
            count: 1,
        });

        const confirmDialog = useAlertDialog();
        const translate = useTranslator();

        // A folder delete is never refused on occupancy: the cascade removes
        // the subtree and the SET NULL unfiles every user and client in it, so
        // this dialog is the only place the operator learns how much that is.
        // The generic AEntityDelete prompt names the entity noun and nothing
        // else, which reads the same for an empty leaf.
        const runDelete = async (row: Path, deletedCb: (item: Path) => void) => {
            const impact = await readPathDeleteImpact(
                httpClient,
                realmManagementId.value ?? null,
                row.path,
            );

            const confirmed = await confirmDialog({
                title: await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.DELETE_CONFIRM_TITLE,
                    data: { entity: entityLabel.value },
                }),
                // a count that could not be read (a truncated subtree, a
                // reader without USER_READ) degrades to the plain warning
                // rather than to a number nobody stands behind
                description: await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: impact.resolved ?
                        TranslatorTranslationAppKey.PATH_DELETE_CONFIRM_DESCRIPTION :
                        TranslatorTranslationAppKey.PATH_DELETE_CONFIRM_UNKNOWN,
                    data: {
                        paths: impact.paths,
                        users: impact.users,
                        clients: impact.clients,
                    },
                }),
                confirmLabel: translations.delete,
                cancelLabel: translations.abort,
                tone: 'error',
            });

            if (!confirmed) {
                return;
            }

            try {
                const deleted = await httpClient.path.delete(row.id);
                deletedCb({ ...deleted.data, id: row.id });
            } catch (e) {
                emit('failed', e);
            }
        };

        // one dialog and one DELETE per click: a second click while the
        // first is still resolving would queue a second prompt and a
        // second request that answers 404 (the guard AEntityDelete carried)
        const deleteBusy = ref(false);
        const handleDelete = async (row: Path, deletedCb: (item: Path) => void) => {
            if (deleteBusy.value) {
                return;
            }

            deleteBusy.value = true;

            try {
                await runDelete(row, deletedCb);
            } finally {
                deleteBusy.value = false;
            }
        };

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
            collection,
            columns,
            handleDelete,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            loadStats,
            query,
            translations,
            VCLink,
        };
    },
});
</script>
<template>
    <APaths
        ref="collection"
        :query="query"
        @deleted="handleDeleted"
    >
        <template #header="props">
            <EntityActivity
                type="path"
                :load="loadStats"
            />
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
                    <VCButton
                        :aria-label="translations.delete"
                        :title="translations.delete"
                        size="sm"
                        color="error"
                        variant="outline"
                        :disabled="!hasDropPermission"
                        @click.prevent="handleDelete(row, props.deleted)"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:trash" />
                        </template>
                    </VCButton>
                </template>
            </VCTable>
        </template>
    </APaths>
</template>
