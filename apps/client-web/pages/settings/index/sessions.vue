<script lang="ts">
import type { Session } from '@authup/core-kit';
import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASearch,
    ASessions,
    injectStore,
    useTranslations,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import type { TableColumn } from '@vuecs/table';
import { computed, defineComponent } from 'vue';
import { definePageMeta } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineComponent({
    components: {
        AEntityDelete,
        APagination,
        ASearch,
        ASessions,
    },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const store = injectStore();
        const { userId } = storeToRefs(store);

        // Scope to the current user's own sessions (an admin holding SESSION_READ
        // would otherwise see every session here); non-admins are self-scoped by
        // the server regardless.
        const query = computed<BuildInput<Session>>(() => ({
            filter: { user_id: userId.value ?? undefined },
            sort: { seen_at: 'DESC' },
        }));

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
            userId,
            query,
            columns,
            translations,
        };
    },
});
</script>
<template>
    <ASessions
        v-if="userId"
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
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </ASessions>
</template>
