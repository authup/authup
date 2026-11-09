<script lang="ts">
import {
    AClientTokenExchangeCapabilities,
    AClientTokenExchangeCapabilityForm,
    AEntityDelete,
    APagination,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import { ClientTokenExchangeRealmScope, PermissionName } from '@authup/core-kit';
import type { Client, ClientTokenExchangeCapability } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { defineQuery } from '@rapiq/core';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { TableColumn } from '@vuecs/table';
import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import { TOKEN_EXCHANGE_CAPABILITY_ACCESS_PERMISSIONS } from '../../../config/permissions';

export default defineComponent({
    components: {
        AClientTokenExchangeCapabilities,
        AClientTokenExchangeCapabilityForm,
        AEntityDelete,
        APagination,
        VCButton,
        VCIcon,
    },
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const hasReadPermission = usePermissionCheck({ name: TOKEN_EXCHANGE_CAPABILITY_ACCESS_PERMISSIONS });
        const hasCreatePermission = usePermissionCheck({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_CREATE });
        const hasUpdatePermission = usePermissionCheck({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE });
        const hasDeletePermission = usePermissionCheck({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_DELETE });

        const query = computed(() => defineQuery<ClientTokenExchangeCapability>({ filters: { clientId: props.entity.id } }));

        const adding = ref(false);
        const editing = ref<ClientTokenExchangeCapability | null>(null);

        const close = () => {
            adding.value = false;
            editing.value = null;
        };

        const openAdd = () => {
            editing.value = null;
            adding.value = true;
        };

        const openEdit = (capability: ClientTokenExchangeCapability) => {
            adding.value = false;
            editing.value = capability;
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const handleDeleted = (capability: ClientTokenExchangeCapability) => {
            if (editing.value?.id === capability.id) {
                editing.value = null;
            }
        };

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_CAPABILITY_DESCRIPTION,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_AUDIENCE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_CAPABILITY_VALUE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_MAX_AGE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_REALM_SCOPE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_REALM_SCOPE_OWN,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.TOKEN_EXCHANGE_REALM_SCOPE_ANY,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ADD,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ABORT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
        ]);

        const columns = computed<TableColumn<ClientTokenExchangeCapability>[]>(() => [
            {
                key: 'audience',
                label: translations.tokenExchangeAudience,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'value',
                label: translations.tokenExchangeCapabilityValue,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'maxAge',
                label: translations.tokenExchangeMaxAge,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'realmScope',
                label: translations.tokenExchangeRealmScope,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        const renderScope = (scope: ClientTokenExchangeCapability['realmScope']) => (
            scope === ClientTokenExchangeRealmScope.ANY ?
                translations.tokenExchangeRealmScopeAny :
                translations.tokenExchangeRealmScopeOwn
        );

        return {
            adding,
            close,
            columns,
            editing,
            handleDeleted,
            handleFailed,
            hasCreatePermission,
            hasDeletePermission,
            hasReadPermission,
            hasUpdatePermission,
            openAdd,
            openEdit,
            query,
            renderScope,
            translations,
        };
    },
});
</script>
<template>
    <AClientTokenExchangeCapabilities
        v-if="hasReadPermission"
        :query="query"
        :client-id="entity.id"
    >
        <template #header="props">
            <div class="mb-3 flex items-start justify-between gap-3">
                <p class="mb-0">
                    {{ translations.tokenExchangeCapabilityDescription }}
                </p>
                <VCButton
                    v-if="hasCreatePermission && !adding"
                    size="sm"
                    color="primary"
                    @click="openAdd"
                >
                    <template #leading>
                        <VCIcon name="fa6-solid:plus" />
                    </template>
                    {{ translations.add }}
                </VCButton>
            </div>
            <div
                v-if="adding || editing"
                class="mb-3"
            >
                <AClientTokenExchangeCapabilityForm
                    :key="editing ? editing.id : 'new'"
                    :entity="editing ?? undefined"
                    :client-id="entity.id"
                    @created="(capability) => { props.created(capability); close(); }"
                    @updated="(capability) => { props.updated(capability); close(); }"
                    @failed="handleFailed"
                />
                <VCButton
                    size="sm"
                    color="neutral"
                    variant="outline"
                    class="mt-2"
                    @click="close"
                >
                    {{ translations.abort }}
                </VCButton>
            </div>
        </template>
        <template #body="props">
            <VCTable
                :data="props.data"
                :columns="columns"
                :busy="props.busy"
            >
                <template #cell-realmScope="{ row }">
                    {{ renderScope(row.realmScope) }}
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        v-if="hasUpdatePermission"
                        size="sm"
                        color="primary"
                        variant="outline"
                        class="me-1"
                        :aria-label="translations.details"
                        :title="translations.details"
                        @click="openEdit(row)"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:bars" />
                        </template>
                    </VCButton>
                    <AEntityDelete
                        v-if="hasDeletePermission"
                        :entity-id="row.id"
                        entity-type="clientTokenExchangeCapability"
                        :with-text="false"
                        @deleted="(capability) => { props.deleted(capability); handleDeleted(capability); }"
                        @failed="handleFailed"
                    />
                </template>
            </VCTable>
        </template>
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
    </AClientTokenExchangeCapabilities>
</template>
