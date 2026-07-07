<script lang="ts">
import type { Session, User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASearch,
    ASessions,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import type { BuildInput } from 'rapiq';
import type { TableColumn } from '@vuecs/table';
import type { PropType } from 'vue';
import { computed } from 'vue';
import { defineNuxtComponent } from '#app';

export default defineNuxtComponent({
    components: {
        AEntityDelete,
        APagination,
        ASearch,
        ASessions,
    },
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    setup(props) {
        const query = computed<BuildInput<Session>>(() => ({
            filter: { user_id: props.entity.id },
            sort: { seen_at: 'DESC' },
        }));

        const hasDropPermission = usePermissionCheck({ name: PermissionName.SESSION_DELETE });

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.IP_ADDRESS },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.USER_AGENT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.SEEN_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.EXPIRES_AT },
        ]);

        const columns = computed<TableColumn<Session>[]>(() => [
            {
                key: 'ip_address',
                label: translations.ipAddress,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'user_agent',
                label: translations.userAgent,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'seen_at',
                label: translations.seenAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'expires_at',
                label: translations.expiresAt,
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
            query,
            columns,
            hasDropPermission,
            translations,
        };
    },
});
</script>
<template>
    <ASessions
        :query="query"
        :body="{ tag: 'div' }"
        :footer="true"
    >
        <template #header="props">
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
                <template #cell-user_agent="{ row }">
                    <span :title="row.user_agent">{{ row.user_agent }}</span>
                </template>
                <template #cell-seen_at="{ row }">
                    <VCTimeago
                        v-if="row.seen_at"
                        :datetime="row.seen_at"
                    />
                    <span v-else>&ndash;</span>
                </template>
                <template #cell-expires_at="{ row }">
                    <VCTimeago :datetime="row.expires_at" />
                </template>
                <template #cell-options="{ row }">
                    <AEntityDelete
                        :entity-id="row.id"
                        entity-type="session"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </ASessions>
</template>
