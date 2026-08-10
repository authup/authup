<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { Session, User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASessions,
    injectHTTPClient,
    usePermissionCheck,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import type { TableColumn } from '@vuecs/table';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { useAlertDialog } from '@vuecs/overlays';
import type { PropType } from 'vue';
import { computed, ref } from 'vue';
import { defineNuxtComponent } from '#app';
import { definePageMeta, useErrorToast, useToast } from '#imports';
import { LayoutKey } from '~/config/layout';

export default defineNuxtComponent({
    components: {
        AEntityDelete,
        APagination,
        ASessions,
        VCButton,
        VCIcon,
    },
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    setup(props) {
        definePageMeta({ [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.SESSION_READ] });

        const query = computed(() => defineQuery<Session>({
            filters: { userId: props.entity.id },
            sort: { seenAt: 'DESC' },
        }));

        const hasDropPermission = usePermissionCheck({ name: PermissionName.SESSION_DELETE });

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.IP_ADDRESS },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.USER_AGENT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.SEEN_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.EXPIRES_AT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_ALL },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_TITLE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_ALL_CONFIRM_DESCRIPTION },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.LOGOUT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.DETAILS },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
        ]);

        const columns = computed<TableColumn<Session>[]>(() => [
            {
                key: 'ipAddress',
                label: translations.ipAddress,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'userAgent',
                label: translations.userAgent,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'seenAt',
                label: translations.seenAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'expiresAt',
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

        // Admin "Log out everywhere" — DELETE /sessions?filter[userId]=<id> revokes
        // every session of the target user on all devices (SESSION_DELETE + realm reach).
        const revokeAll = async (reload: () => Promise<void>) => {
            if (revoking.value) {
                return;
            }

            const confirmed = await confirmDialog({
                title: translations.sessionRevokeAllConfirmTitle,
                description: translations.sessionRevokeAllConfirmDescription,
                confirmLabel: translations.logout,
                cancelLabel: translations.abort,
                tone: 'error',
            });

            if (!confirmed) {
                return;
            }

            revoking.value = true;
            try {
                const response = await httpClient.session.deleteMany({ filters: { userId: props.entity.id } });

                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.SESSION_REVOKE_ALL_SUCCESS,
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
            query,
            columns,
            hasDropPermission,
            translations,
            revoking,
            revokeAll,
            VCLink,
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
            <div
                v-if="hasDropPermission"
                class="flex justify-end mb-2"
            >
                <VCButton
                    :label="translations.sessionRevokeAll"
                    size="sm"
                    color="error"
                    variant="outline"
                    :disabled="revoking || (props.total ?? 0) === 0"
                    @click="revokeAll(props.load)"
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
                <template #cell-userAgent="{ row }">
                    <span :title="row.userAgent">{{ row.userAgent }}</span>
                </template>
                <template #cell-seenAt="{ row }">
                    <VCTimeago
                        v-if="row.seenAt"
                        :datetime="row.seenAt"
                    />
                    <span v-else>&ndash;</span>
                </template>
                <template #cell-expiresAt="{ row }">
                    <VCTimeago :datetime="row.expiresAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="VCLink"
                        :to="`/sessions/${row.id}`"
                        :aria-label="translations.details"
                        :title="translations.details"
                        size="sm"
                        color="primary"
                        variant="outline"
                        class="me-1"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:bars" />
                        </template>
                    </VCButton>
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
