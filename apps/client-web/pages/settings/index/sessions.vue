<script lang="ts">
import type { Session } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASearch,
    ASessions,
    injectHTTPClient,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import type { TableColumn } from '@vuecs/table';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { useAlertDialog } from '@vuecs/overlays';
import { computed, defineComponent, ref } from 'vue';
import { definePageMeta, useErrorToast, useToast } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineComponent({
    components: {
        AEntityDelete,
        APagination,
        ASearch,
        ASessions,
        VCButton,
        VCIcon,
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
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_TITLE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_DESCRIPTION },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.LOGOUT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
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

        const httpClient = injectHTTPClient();
        const toast = useToast();
        const errorToast = useErrorToast();
        const translate = useTranslator();
        const confirmDialog = useAlertDialog();
        const revoking = ref(false);

        // "Log out my other devices" — DELETE /sessions revokes every session of
        // the current identity except the one this request authenticates with.
        const revokeOthers = async (reload: () => Promise<void>) => {
            if (revoking.value) {
                return;
            }

            const confirmed = await confirmDialog({
                title: translations.sessionRevokeOthersConfirmTitle,
                description: translations.sessionRevokeOthersConfirmDescription,
                confirmLabel: translations.logout,
                cancelLabel: translations.abort,
                tone: 'warning',
            });

            if (!confirmed) {
                return;
            }

            revoking.value = true;
            try {
                const response = await httpClient.session.deleteMany();

                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_SUCCESS,
                        data: { amount: response.count },
                    }),
                });

                await reload();
            } catch (e) {
                await errorToast.show(e);
            } finally {
                revoking.value = false;
            }
        };

        return {
            userId,
            query,
            columns,
            translations,
            revoking,
            revokeOthers,
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
            <div class="flex flex-wrap items-center gap-2">
                <div class="flex-grow">
                    <ASearch
                        :load="props.load"
                        :busy="props.busy"
                    />
                </div>
                <VCButton
                    :label="translations.sessionRevokeOthers"
                    size="sm"
                    color="error"
                    variant="outline"
                    :disabled="revoking || (props.total ?? 0) <= 1"
                    @click="revokeOthers(props.load)"
                >
                    <template #leading>
                        <VCIcon name="fa6-solid:right-from-bracket" />
                    </template>
                </VCButton>
            </div>
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
