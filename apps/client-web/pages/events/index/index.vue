<script lang="ts">

import type { Event as EventEntity } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEvents,
    APagination,
    ASearch,
    ATitle,
    useTranslations,
} from '@authup/client-web-kit';
import type { BuildInput } from 'rapiq';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { TableColumn } from '@vuecs/table';
import { computed, defineComponent, resolveComponent } from 'vue';
import { definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        AEvents,
        VCButton,
        VCIcon,
    },
    emits: ['failed'],
    setup(_props, { emit }) {
        definePageMeta({ [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.EVENT_READ] });

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        const query : BuildInput<EventEntity> = { sort: { createdAt: 'DESC' } };

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.REF,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ACTOR,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.IP_ADDRESS,
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

        const columns = computed<TableColumn<EventEntity>[]>(() => [
            {
                key: 'name',
                label: translations.name,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'ref',
                label: translations.ref,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'actor',
                label: translations.actor,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'requestIpAddress',
                label: translations.ipAddress,
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

        const shortenId = (id: string) => (id.length > 8 ? `${id.slice(0, 8)}…` : id);

        const NuxtLink = resolveComponent('NuxtLink');

        return {
            columns,
            handleFailed,
            query,
            shortenId,
            translations,
            NuxtLink,
        };
    },
});
</script>
<template>
    <AEvents
        :query="query"
        @failed="handleFailed"
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
                <template #cell-name="{ row }">
                    <div class="leading-tight">
                        {{ row.name }}
                        <div class="text-xs text-fg-muted">
                            {{ row.scope }}
                        </div>
                    </div>
                </template>
                <template #cell-ref="{ row }">
                    <div
                        v-if="row.refType"
                        class="leading-tight"
                    >
                        {{ row.refType }}
                        <div
                            v-if="row.refId"
                            class="text-xs text-fg-muted font-mono"
                            :title="row.refId"
                        >
                            {{ shortenId(row.refId) }}
                        </div>
                    </div>
                    <span v-else>&ndash;</span>
                </template>
                <template #cell-actor="{ row }">
                    <div
                        v-if="row.actorName || row.actorId"
                        class="leading-tight"
                    >
                        {{ row.actorName ?? row.actorId }}
                        <div
                            v-if="row.actorType"
                            class="text-xs text-fg-muted"
                        >
                            {{ row.actorType }}
                        </div>
                    </div>
                    <span v-else>&ndash;</span>
                </template>
                <template #cell-requestIpAddress="{ row }">
                    <span v-if="row.requestIpAddress">{{ row.requestIpAddress }}</span>
                    <span v-else>&ndash;</span>
                </template>
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="NuxtLink"
                        :to="'/events/'+ row.id"
                        :aria-label="translations.details"
                        :title="translations.details"
                        size="sm"
                        color="primary"
                        variant="outline"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:bars" />
                        </template>
                    </VCButton>
                </template>
            </VCTable>
        </template>
    </AEvents>
</template>
