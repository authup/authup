<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import type { IdentityProvider, IdentityProviderAccount } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AIdentityProviderIcon,
    injectHTTPClient,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import { useAlertDialog, useToast } from '@vuecs/overlays';
import {
    computed, 
    defineComponent, 
    onMounted, 
    ref,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountToasts } from './utils';

export default defineComponent({
    components: {
        AIdentityProviderIcon,
        VCButton,
    },
    setup() {
        const store = injectStore();
        const { userId, realmId } = storeToRefs(store);

        const httpClient = injectHTTPClient();
        const toast = useToast();
        const toasts = useAccountToasts();
        const translate = useTranslator();
        const confirmDialog = useAlertDialog();
        const route = useRoute();
        const router = useRouter();

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONNECTED_ACCOUNTS },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONNECTED_ACCOUNTS_NONE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.IDENTITY_PROVIDER_CONNECT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.IDENTITY_PROVIDER_DISCONNECT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.IDENTITY_PROVIDER_DISCONNECT_CONFIRM_TITLE },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.IDENTITY_PROVIDER_DISCONNECT_CONFIRM_DESCRIPTION },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.ABORT },
        ]);

        const providers = ref<IdentityProvider[]>([]);
        const accounts = ref<IdentityProviderAccount[]>([]);
        const busy = ref(false);
        const loaded = ref(false);
        const errored = ref(false);

        const accountByProvider = computed(() => {
            const map = new Map<string, IdentityProviderAccount>();
            accounts.value.forEach((account) => map.set(account.providerId, account));
            return map;
        });

        const load = async () => {
            if (!userId.value || !realmId.value) {
                return;
            }

            errored.value = false;
            try {
                const [providerResponse, accountResponse] = await Promise.all([
                    httpClient.identityProvider.getMany({
                        filters: {
                            realmId: realmId.value,
                            enabled: true,
                        },
                        pagination: { limit: 50 },
                    }),
                    // Scoped to the current user explicitly: an admin holding
                    // IDENTITY_PROVIDER_ACCOUNT_READ would otherwise see every
                    // subject's rows here; non-admins are self-scoped by the
                    // server regardless.
                    httpClient.identityProviderAccount.getMany({
                        filters: { userId: userId.value },
                        pagination: { limit: 50 },
                    }),
                ]);

                providers.value = providerResponse.data;
                accounts.value = accountResponse.data;
            } catch (e) {
                // A load failure must not fall through to the empty state
                // ("no providers configured") — it would misreport an error
                // as an absence. The toast carries the failure; the empty
                // state is suppressed by `errored`.
                errored.value = true;
                await toasts.error(e);
            } finally {
                loaded.value = true;
            }
        };

        // Complete the link round-trip, then strip the marker params from
        // the URL (single use, reload-safe).
        //
        // The callback that resolved the external identity is unauthenticated
        // and deliberately writes nothing (issue #3439). It hands back a
        // one-time handle, and the account row is created HERE, on a request
        // carrying this browser's bearer, so the binding is made for whoever
        // is actually signed in rather than for a userId the callback was
        // told to trust.
        const consumeReturnParams = async () => {
            const handle = typeof route.query.linkHandle === 'string' ? route.query.linkHandle : undefined;
            const linkError = typeof route.query.linkError === 'string' ? route.query.linkError : undefined;
            const providerId = typeof route.query.provider === 'string' ? route.query.provider : undefined;
            if (!handle && !linkError) {
                return;
            }

            if (handle && providerId) {
                try {
                    await httpClient.identityProvider.confirmLinkRequest(providerId, handle);

                    toasts.success(await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.IDENTITY_PROVIDER_LINK_SUCCESS,
                    }));
                } catch (e) {
                    // carries the server's own message, including the
                    // localized "already linked to another user"
                    await toasts.error(e);
                }
            }

            if (linkError) {
                toast.add({
                    description: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.IDENTITY_PROVIDER_LINK_FAILED,
                    }),
                    color: 'error',
                });
            }

            const query = { ...route.query };
            delete query.linkHandle;
            delete query.linkError;
            delete query.provider;
            await router.replace({ path: route.path, query });
        };

        onMounted(async () => {
            await consumeReturnParams();
            await load();
        });

        const connect = async (provider: IdentityProvider) => {
            if (busy.value) {
                return;
            }

            busy.value = true;
            try {
                const { url } = await httpClient.identityProvider.createLinkRequest(provider.id);
                window.location.href = url;
            } catch (e) {
                busy.value = false;
                await toasts.error(e);
            }
        };

        const disconnect = async (account: IdentityProviderAccount) => {
            if (busy.value) {
                return;
            }

            const confirmed = await confirmDialog({
                title: translations.identityProviderDisconnectConfirmTitle,
                description: translations.identityProviderDisconnectConfirmDescription,
                confirmLabel: translations.identityProviderDisconnect,
                cancelLabel: translations.abort,
                tone: 'error',
            });
            if (!confirmed) {
                return;
            }

            busy.value = true;
            try {
                await httpClient.identityProviderAccount.delete(account.id);
                await load();
            } catch (e) {
                // A lockout rejection surfaces its localized message via the
                // error translator (authupError catalog).
                await toasts.error(e);
            } finally {
                busy.value = false;
            }
        };

        return {
            providers,
            accountByProvider,
            translations,
            busy,
            loaded,
            errored,
            connect,
            disconnect,
        };
    },
});
</script>
<template>
    <div>
        <h2 class="text-lg font-semibold mb-2">
            {{ translations.connectedAccounts }}
        </h2>
        <div
            v-if="loaded && !errored && providers.length === 0"
            class="text-fg-muted"
        >
            {{ translations.connectedAccountsNone }}
        </div>
        <div class="flex flex-col gap-2">
            <div
                v-for="provider in providers"
                :key="provider.id"
                class="rounded border border-border p-3 flex items-center gap-3"
            >
                <AIdentityProviderIcon
                    :entity="provider"
                    class="text-fg-muted"
                />
                <div class="flex-1 min-w-0">
                    <div class="font-bold">
                        {{ provider.displayName || provider.name }}
                    </div>
                    <small
                        v-if="accountByProvider.has(provider.id)"
                        class="text-fg-muted"
                    >
                        {{ accountByProvider.get(provider.id)?.providerUserName }}
                    </small>
                </div>
                <VCButton
                    v-if="accountByProvider.has(provider.id)"
                    size="sm"
                    color="error"
                    variant="outline"
                    :disabled="busy"
                    @click="disconnect(accountByProvider.get(provider.id)!)"
                >
                    {{ translations.identityProviderDisconnect }}
                </VCButton>
                <VCButton
                    v-else
                    size="sm"
                    color="primary"
                    variant="outline"
                    :disabled="busy"
                    @click="connect(provider)"
                >
                    {{ translations.identityProviderConnect }}
                </VCButton>
            </div>
        </div>
    </div>
</template>
