<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { Session } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASessions,
    injectHTTPClient,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCTimeago } from '@vuecs/timeago';
import { useAlertDialog } from '@vuecs/overlays';
import { computed, defineComponent, ref } from 'vue';
import { useAccountToasts } from './utils';

export default defineComponent({
    components: {
        AEntityDelete,
        APagination,
        ASessions,
        VCButton,
        VCIcon,
        VCTimeago,
    },
    setup() {
        const store = injectStore();
        const { userId, sessionId } = storeToRefs(store);

        // Scope to the current user's own sessions (an admin holding
        // SESSION_READ would otherwise see every session here); non-admins
        // are self-scoped by the server regardless.
        const query = computed(() => defineQuery<Session>({
            filters: { userId: userId.value ?? undefined },
            sort: { seenAt: 'DESC' },
        }));

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.SESSION,
                count: 2,
            },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_TITLE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_CONFIRM_DESCRIPTION },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_CURRENT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.LOGOUT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
        ]);

        const httpClient = injectHTTPClient();
        const toasts = useAccountToasts();
        const translate = useTranslator();
        const confirmDialog = useAlertDialog();
        const revoking = ref(false);

        // "Log out my other devices" — DELETE /sessions revokes every session
        // of the current identity except the one this request authenticates
        // with.
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

                toasts.success(await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.SESSION_REVOKE_OTHERS_SUCCESS,
                    data: { amount: response.count },
                }));

                await reload();
            } catch (e) {
                await toasts.error(e);
            } finally {
                revoking.value = false;
            }
        };

        return {
            userId,
            sessionId,
            query,
            translations,
            revoking,
            revokeOthers,
        };
    },
});
</script>
<template>
    <div>
        <h2 class="text-lg font-semibold mb-2">
            {{ translations.session }}
        </h2>
        <ASessions
            v-if="userId"
            :query="query"
            :body="{ tag: 'div' }"
            :footer="true"
        >
            <template #header="props">
                <div class="flex justify-end mb-2">
                    <VCButton
                        size="sm"
                        color="error"
                        variant="outline"
                        :disabled="revoking || (props.total ?? 0) <= 1"
                        @click="revokeOthers(props.load)"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:right-from-bracket" />
                        </template>
                        {{ translations.sessionRevokeOthers }}
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
                <div class="flex flex-col gap-2">
                    <div
                        v-for="row in props.data"
                        :key="row.id"
                        class="rounded border border-border p-3 flex items-center gap-3"
                    >
                        <VCIcon
                            name="fa6-solid:desktop"
                            class="text-fg-muted"
                        />
                        <div class="flex-1 min-w-0">
                            <div
                                class="truncate"
                                :title="row.userAgent || undefined"
                            >
                                <template v-if="row.userAgent">
                                    {{ row.userAgent }}
                                </template>
                                <span v-else>&ndash;</span>
                            </div>
                            <small class="text-fg-muted flex flex-wrap gap-2">
                                <span v-if="row.ipAddress">{{ row.ipAddress }}</span>
                                <VCTimeago
                                    v-if="row.seenAt"
                                    :datetime="row.seenAt"
                                />
                            </small>
                        </div>
                        <span
                            v-if="row.id === sessionId"
                            class="inline-flex items-center rounded-full bg-primary-600/10 px-2 py-0.5 text-xs font-medium text-primary-600"
                        >
                            {{ translations.sessionCurrent }}
                        </span>
                        <AEntityDelete
                            v-else
                            :entity-id="row.id"
                            entity-type="session"
                            :with-text="false"
                            @deleted="props.deleted"
                        />
                    </div>
                </div>
            </template>
        </ASessions>
    </div>
</template>
