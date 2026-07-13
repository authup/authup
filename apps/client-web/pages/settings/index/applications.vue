<script lang="ts">
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
import type { BuildInput } from 'rapiq';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { useAlertDialog } from '@vuecs/overlays';
import { computed, defineComponent, ref } from 'vue';
import { definePageMeta, useErrorToast, useToast } from '#imports';
import { LayoutKey } from '~/config/layout';

type ConsentGroup = {
    clientId: string,
    name: string,
    createdAt: string,
    rows: Consent[],
};

export default defineComponent({
    components: {
        AConsents,
        APagination,
        VCButton,
        VCIcon,
    },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const store = injectStore();
        const { userId } = storeToRefs(store);

        // Scope to the current user's own consent rows (an admin holding
        // CONSENT_READ would otherwise see every row here); non-admins are
        // self-scoped by the server regardless. The client relation is
        // included so application names render.
        const query = computed<BuildInput<Consent>>(() => ({
            filter: { sub: userId.value ?? undefined, sub_kind: 'user' },
            sort: { created_at: 'DESC' },
            relations: ['client'],
        }));

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_EMPTY },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE_ALL },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_TITLE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_REVOKE_ALL_DESCRIPTION },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONSENT_SCOPES },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
        ]);

        // Per-scope rows → one card per application.
        const groupByClient = (rows: Consent[]) : ConsentGroup[] => {
            const groups = new Map<string, ConsentGroup>();

            rows.forEach((row) => {
                let group = groups.get(row.client_id);
                if (!group) {
                    group = {
                        clientId: row.client_id,
                        name: row.client?.display_name || row.client?.name || row.client_id,
                        createdAt: row.created_at,
                        rows: [],
                    };
                    groups.set(row.client_id, group);
                }

                group.rows.push(row);

                if (row.created_at < group.createdAt) {
                    group.createdAt = row.created_at;
                }
            });

            return [...groups.values()];
        };

        const httpClient = injectHTTPClient();
        const toast = useToast();
        const errorToast = useErrorToast();
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
                await errorToast.show(e);
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

            revoking.value = true;
            try {
                await Promise.all(group.rows.map(
                    (row) => httpClient.consent.delete(row.id),
                ));

                toast.show({
                    variant: 'success',
                    body: translations.consentRevokeAllDescription,
                });

                await reload();
            } catch (e) {
                await errorToast.show(e);

                // reload regardless — surviving rows show up again.
                await reload();
            } finally {
                revoking.value = false;
            }
        };

        return {
            userId,
            query,
            translations,
            groupByClient,
            revoking,
            revokeOne,
            revokeAll,
        };
    },
});
</script>
<template>
    <AConsents
        v-if="userId"
        :query="query"
        :body="{ tag: 'div' }"
        :footer="true"
        :no-more="{ content: translations.consentEmpty }"
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
                            :label="translations.consentRevokeAll"
                            size="sm"
                            color="error"
                            variant="outline"
                            :disabled="revoking"
                            @click="revokeAll(group, props.load)"
                        >
                            <template #leading>
                                <VCIcon name="fa6-solid:ban" />
                            </template>
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
                                class="inline-flex items-center gap-1 rounded-full bg-primary-600/10 px-2 py-0.5 text-xs font-medium text-primary-600"
                            >
                                {{ row.scope }}
                                <button
                                    type="button"
                                    class="bg-transparent border-0 p-0 cursor-pointer text-inherit"
                                    :title="translations.consentRevoke"
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
</template>
