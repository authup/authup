<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { defineQuery } from '@rapiq/core';
import type { Consent } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AConsents,
    APagination,
    injectHTTPClient,
    injectStore,
    useTranslations,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCTimeago } from '@vuecs/timeago';
import { useAlertDialog } from '@vuecs/overlays';
import { computed, defineComponent, ref } from 'vue';
import PageError from '../components/PageError.vue';
import { useAccountToasts, usePageError } from './utils';

type ConsentGroup = {
    clientId: string,
    name: string,
    createdAt: string,
    rows: Consent[],
};

const SCOPE_CHIP_CLASS = 'inline-flex items-center gap-1 rounded-full bg-primary-600/10 px-2 py-0.5 text-xs font-medium text-primary-600';

export default defineComponent({
    components: {
        AConsents,
        APagination,
        PageError,
        VCButton,
        VCIcon,
        VCTimeago,
    },
    setup() {
        const store = injectStore();
        const { userId } = storeToRefs(store);

        // Scope to the current user's own consent rows (an admin holding
        // CONSENT_READ would otherwise see every row here); non-admins are
        // self-scoped by the server regardless. The server always joins a
        // client summary (id/name/displayName), so no relation is requested.
        const query = computed(() => defineQuery<Consent>({
            filters: { sub: userId.value ?? undefined, subKind: 'user' },
            sorts: { createdAt: 'DESC' },
        }));

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.APPLICATIONS },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_EMPTY },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE_ALL },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_TITLE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_DESCRIPTION },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_SUCCESS },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_SCOPES },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
        ]);

        // Per-scope rows → one card per application.
        const groupByClient = (rows: Consent[]) : ConsentGroup[] => {
            const groups = new Map<string, ConsentGroup>();

            rows.forEach((row) => {
                let group = groups.get(row.clientId);
                if (!group) {
                    group = {
                        clientId: row.clientId,
                        name: row.client?.displayName || row.client?.name || row.clientId,
                        createdAt: row.createdAt,
                        rows: [],
                    };
                    groups.set(row.clientId, group);
                }

                group.rows.push(row);

                if (row.createdAt < group.createdAt) {
                    group.createdAt = row.createdAt;
                }
            });

            return Array.from(groups.values());
        };

        const httpClient = injectHTTPClient();
        const toasts = useAccountToasts();
        const pageError = usePageError();
        const confirmDialog = useAlertDialog();
        const revoking = ref(false);

        // Revoke a single granted scope (one consent row).
        const revokeOne = async (row: Consent, deleted: (entity: Consent) => void) => {
            const confirmed = await confirmDialog({
                title: translations.consentRevoke,
                description: translations.consentRevokeAllDescription,
                confirmLabel: translations.consentRevoke,
                cancelLabel: translations.abort,
                tone: 'error',
            });

            if (!confirmed) {
                return;
            }

            try {
                await httpClient.consent.delete(row.id);

                deleted(row);
            } catch (e) {
                await toasts.error(e);
            }
        };

        // Revoke every scope granted to an application (looped row deletes).
        const revokeAll = async (group: ConsentGroup, reload: () => Promise<void>) => {
            if (revoking.value) {
                return;
            }

            const confirmed = await confirmDialog({
                title: translations.consentRevokeAllTitle,
                description: translations.consentRevokeAllDescription,
                confirmLabel: translations.consentRevokeAll,
                cancelLabel: translations.abort,
                tone: 'error',
            });

            if (!confirmed) {
                return;
            }

            // Re-read the subject AFTER the dialog resolved. The template only
            // renders these controls while a user is present, but the await
            // above is a window: a logout or an expired session in the
            // meantime clears the store, and every filter below would then
            // widen to "no subject". For an administrator, who is not
            // force-scoped server-side, that turns a personal revoke into one
            // that reaches every user of the application.
            const subject = userId.value;
            if (!subject) {
                return;
            }

            revoking.value = true;
            try {
                // Revoke every consent for this client, not only the rows on
                // the current page — with per-scope rows a client can span
                // pages, and a "revoke all" that stopped at the visible page
                // would leave some scopes granted. The server caps the page
                // size (the consent schema's pagination.maxLimit), so loop
                // fetch-and-delete until no rows remain; each pass deletes
                // everything it fetched, so the loop converges. The iteration
                // bound is a defensive backstop only.
                for (let i = 0; i < 100; i++) {
                    const { data: rows } = await httpClient.consent.getMany({
                        filters: {
                            clientId: group.clientId,
                            sub: subject,
                            subKind: 'user',
                        },
                        pagination: { limit: 50 },
                    });

                    if (rows.length === 0) {
                        break;
                    }

                    await Promise.all(rows.map(
                        (row) => httpClient.consent.delete(row.id),
                    ));
                }

                // Consent is prompt-level: it stops the next silent issue and
                // leaves live tokens working. Revoking the application's tokens
                // is what actually signs the user out of it, and because the
                // rows hang off the session rather than the session itself, the
                // other applications on the same session stay signed in.
                //
                // Scoped to THIS user's own sessions explicitly. The server
                // force-scopes a caller that lacks SESSION_DELETE, but an admin
                // holds it, so relying on that would have an administrator
                // revoke the application for everyone from their own account
                // page.
                // Page through the sessions and revoke per batch. A single
                // page would leave the application signed in on every session
                // past the server's page cap, and batching also keeps the
                // session id list out of an unbounded query string.
                //
                // Offset paging, not the fetch-until-empty loop the consents
                // use above: those rows are deleted as they are read, so that
                // loop converges. Sessions survive this operation, so it would
                // never terminate. The iteration bound is a defensive backstop.
                const limit = 50;
                for (let i = 0; i < 100; i++) {
                    const { data: sessions } = await httpClient.session.getMany({
                        filters: { userId: subject },
                        pagination: {
                            limit,
                            offset: i * limit,
                        },
                    });

                    if (sessions.length === 0) {
                        break;
                    }

                    await httpClient.sessionToken.deleteMany({
                        filters: {
                            sessionId: sessions.map((session) => session.id),
                            clientId: group.clientId,
                        },
                    });

                    if (sessions.length < limit) {
                        break;
                    }
                }

                toasts.success(translations.consentRevokeAllSuccess);

                await reload();
            } catch (e) {
                await toasts.error(e);

                // reload regardless — surviving rows show up again.
                await reload();
            } finally {
                revoking.value = false;
            }
        };

        return {
            userId,
            query,
            error: pageError.error,
            capture: pageError.capture,
            reset: pageError.reset,
            translations,
            groupByClient,
            revoking,
            revokeOne,
            revokeAll,
            scopeChipClass: SCOPE_CHIP_CLASS,
        };
    },
});
</script>
<template>
    <div>
        <h2 class="text-lg font-semibold mb-2">
            {{ translations.applications }}
        </h2>
        <PageError
            v-if="error"
            @retry="reset"
        />
        <AConsents
            v-else-if="userId"
            :query="query"
            :body="{ tag: 'div' }"
            :footer="true"
            :no-more="{ content: translations.consentEmpty }"
            @failed="capture"
        >
            <template #footer="props">
                <APagination
                    :busy="props.busy"
                    :meta="props.meta"
                    :load="props.load"
                />
            </template>
            <template #body="props">
                <div class="flex flex-col gap-3">
                    <div
                        v-for="group in groupByClient(props.data)"
                        :key="group.clientId"
                        class="rounded border border-border p-3 flex flex-col gap-2"
                    >
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <div class="font-bold">
                                    {{ group.name }}
                                </div>
                                <small class="text-fg-muted">
                                    <VCTimeago :datetime="group.createdAt" />
                                </small>
                            </div>
                            <VCButton
                                size="sm"
                                color="error"
                                variant="outline"
                                :disabled="revoking"
                                @click="revokeAll(group, props.load)"
                            >
                                <template #leading>
                                    <VCIcon name="fa6-solid:ban" />
                                </template>
                                {{ translations.consentRevokeAll }}
                            </VCButton>
                        </div>
                        <div>
                            <small class="text-fg-muted">
                                {{ translations.consentScopes }}
                            </small>
                            <div class="flex flex-wrap gap-1 mt-1">
                                <span
                                    v-for="row in group.rows"
                                    :key="row.id"
                                    :class="scopeChipClass"
                                >
                                    {{ row.scope }}
                                    <button
                                        type="button"
                                        class="bg-transparent border-0 p-0 cursor-pointer text-inherit"
                                        :title="translations.consentRevoke"
                                        :aria-label="translations.consentRevoke"
                                        :disabled="revoking"
                                        @click.prevent="revokeOne(row, props.deleted)"
                                    >
                                        <VCIcon name="fa6-solid:xmark" />
                                    </button>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </AConsents>
    </div>
</template>
