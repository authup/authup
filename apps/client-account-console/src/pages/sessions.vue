<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { Session, SessionToken } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ASessionTokens,
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
import PageError from '../components/PageError.vue';
import { useAccountToasts, usePageError } from './utils';

// One line on purpose: Tailwind's scanner must see the arbitrary-value
// candidate unbroken to generate the utility.
const TOKEN_GRID_CLASSES = 'sm:grid sm:items-center sm:gap-x-3 sm:grid-cols-[minmax(0,1fr)_4.75rem_8.75rem_8.75rem_5.5rem]';

const TOKEN_ROW_CLASSES = `py-1.5 text-sm ${TOKEN_GRID_CLASSES}`;

export default defineComponent({
    components: {
        AEntityDelete,
        APagination,
        ASessionTokens,
        ASessions,
        PageError,
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
            sorts: { seenAt: 'DESC' },
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
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.DETAILS },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_ACTIVE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_CONSUMED },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_REVOKED },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SESSION_TOKEN_STATUS_EXPIRED },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.CREATED_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.EXPIRES_AT },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.KIND },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.STATUS },
            { namespace: TranslatorTranslationNamespace.COMMON, key: TranslatorTranslationCommonKey.APPLICATION },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
        ]);

        const httpClient = injectHTTPClient();
        const toasts = useAccountToasts();
        const pageError = usePageError();
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

        // A failed token load is flagged per row rather than through the
        // page error: the inventory belongs to one expanded session, so
        // taking the whole session list down for it would be a worse
        // report than the one this fixes. Clearing the flag re-mounts that
        // row's collection, which re-fetches. No 401 branch here: the
        // outer session list loads first on the same bearer, so a dead
        // session is already handled before a row can be expanded.
        const tokensFailed = ref<Record<string, boolean>>({});

        const expanded = ref<Record<string, boolean>>({});
        const toggleTokens = (id: string) => {
            expanded.value[id] = !expanded.value[id];
        };

        const buildTokensQuery = (id: string) => defineQuery<SessionToken>({
            filters: { sessionId: id },
            sorts: { createdAt: 'DESC' },
        });

        const tokenState = (row: SessionToken): 'revoked' | 'consumed' | 'expired' | 'active' => {
            if (row.revokedAt) {
                return 'revoked';
            }
            if (row.consumedAt) {
                return 'consumed';
            }
            if (row.expiresAt && Date.parse(row.expiresAt) < Date.now()) {
                return 'expired';
            }

            return 'active';
        };

        const tokenStatus = (row: SessionToken): string => {
            switch (tokenState(row)) {
                case 'revoked':
                    return translations.sessionTokenStatusRevoked;
                case 'consumed':
                    return translations.sessionTokenStatusConsumed;
                case 'expired':
                    return translations.sessionTokenStatusExpired;
                default:
                    return translations.sessionTokenStatusActive;
            }
        };

        const tokenStatusClass = (row: SessionToken): string => {
            switch (tokenState(row)) {
                case 'revoked':
                    return 'bg-error-600/10 text-error-600';
                case 'consumed':
                case 'expired':
                    return 'bg-fg-muted/10 text-fg-muted';
                default:
                    return 'bg-success-600/10 text-success-600';
            }
        };

        return {
            userId,
            sessionId,
            query,
            error: pageError.error,
            capture: pageError.capture,
            reset: pageError.reset,
            translations,
            revoking,
            revokeOthers,
            expanded,
            tokensFailed,
            toggleTokens,
            buildTokensQuery,
            tokenStatus,
            tokenStatusClass,
            tokenGridClasses: TOKEN_GRID_CLASSES,
            tokenRowClasses: TOKEN_ROW_CLASSES,
        };
    },
});
</script>
<template>
    <div>
        <h2 class="text-lg font-semibold mb-2">
            {{ translations.session }}
        </h2>
        <PageError
            v-if="error"
            @retry="reset"
        />
        <ASessions
            v-else-if="userId"
            :query="query"
            :body="{ tag: 'div' }"
            :footer="true"
            @failed="capture"
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
                        class="rounded border border-border"
                    >
                        <div class="p-3 flex items-center gap-3">
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
                            <VCButton
                                size="sm"
                                color="primary"
                                variant="outline"
                                :aria-label="translations.details"
                                :title="translations.details"
                                @click="toggleTokens(row.id)"
                            >
                                <template #leading>
                                    <VCIcon :name="expanded[row.id] ? 'fa6-solid:chevron-up' : 'fa6-solid:chevron-down'" />
                                </template>
                            </VCButton>
                            <AEntityDelete
                                v-if="row.id !== sessionId"
                                :entity-id="row.id"
                                entity-type="session"
                                :with-text="false"
                                @deleted="props.deleted"
                            />
                        </div>
                        <div
                            v-if="expanded[row.id]"
                            class="border-t border-border p-3"
                        >
                            <PageError
                                v-if="tokensFailed[row.id]"
                                @retry="tokensFailed[row.id] = false"
                            />
                            <ASessionTokens
                                v-else
                                :query="buildTokensQuery(row.id)"
                                :body="{ tag: 'div' }"
                                :footer="true"
                                @failed="tokensFailed[row.id] = true"
                            >
                                <template #footer="tokenProps">
                                    <APagination
                                        :busy="tokenProps.busy"
                                        :meta="tokenProps.meta"
                                        :load="tokenProps.load"
                                    />
                                </template>
                                <template #body="tokenProps">
                                    <div
                                        class="hidden border-b border-border pb-1.5 text-[0.65rem] font-semibold uppercase
                                            tracking-wider text-fg-muted"
                                        :class="tokenGridClasses"
                                    >
                                        <span>{{ translations.application }}</span>
                                        <span class="text-center">{{ translations.kind }}</span>
                                        <span>{{ translations.createdAt }}</span>
                                        <span>{{ translations.expiresAt }}</span>
                                        <span class="text-right">{{ translations.status }}</span>
                                    </div>
                                    <div class="flex flex-col divide-y divide-border">
                                        <div
                                            v-for="token in tokenProps.data"
                                            :key="token.id"
                                            :class="tokenRowClasses"
                                        >
                                            <div class="flex items-center gap-2 sm:contents">
                                                <span
                                                    class="flex-1 min-w-0 truncate sm:col-start-1 sm:row-start-1 sm:flex-none"
                                                    :class="token.client ? 'font-medium' : 'text-fg-muted'"
                                                >
                                                    <template v-if="token.client">
                                                        {{ token.client.displayName ?? token.client.name }}
                                                    </template>
                                                    <template v-else>
                                                        &ndash;
                                                    </template>
                                                </span>
                                                <span
                                                    class="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-xs text-fg-muted
                                                        sm:col-start-2 sm:row-start-1 sm:w-full sm:text-center"
                                                >
                                                    {{ token.kind }}
                                                </span>
                                                <span
                                                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                                                        sm:col-start-5 sm:row-start-1 sm:justify-self-end"
                                                    :class="tokenStatusClass(token)"
                                                >
                                                    {{ tokenStatus(token) }}
                                                </span>
                                            </div>
                                            <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-muted sm:contents">
                                                <span class="sm:col-start-3 sm:row-start-1 sm:text-sm">
                                                    <span class="sm:hidden">{{ translations.createdAt }}: </span>
                                                    <VCTimeago :datetime="token.createdAt" />
                                                </span>
                                                <span
                                                    class="sm:hidden"
                                                    aria-hidden="true"
                                                >&middot;</span>
                                                <span class="sm:col-start-4 sm:row-start-1 sm:text-sm">
                                                    <span class="sm:hidden">{{ translations.expiresAt }}: </span>
                                                    <VCTimeago
                                                        v-if="token.expiresAt"
                                                        :datetime="token.expiresAt"
                                                    />
                                                    <template v-else>
                                                        &ndash;
                                                    </template>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </ASessionTokens>
                        </div>
                    </div>
                </div>
            </template>
        </ASessions>
    </div>
</template>
