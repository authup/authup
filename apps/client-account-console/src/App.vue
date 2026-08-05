<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import {
    AAuthApp,
    StoreAuthStatus,
    buildEndSessionURL,
    createColorMode,
    injectStore,
    useTranslation,
} from '@authup/client-web-kit';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCIcon } from '@vuecs/icon';
import { VCAlertDialogProvider } from '@vuecs/overlays';
import { storeToRefs } from 'pinia';
import { computed, defineComponent } from 'vue';
import { injectAccountConsoleConfig } from './di';

export default defineComponent({
    components: {
        AAuthApp, 
        VCAlertDialogProvider, 
        VCIcon, 
    },
    setup() {
        const config = injectAccountConsoleConfig();
        const { isDark } = createColorMode();

        const store = injectStore();
        const { status, user } = storeToRefs(store);

        const authenticated = computed(() => config.enabled &&
            status.value === StoreAuthStatus.AUTHENTICATED);

        const userName = computed(() => {
            if (!user.value) {
                return '';
            }

            return user.value.displayName || user.value.name;
        });

        const signOutLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.SIGN_OUT,
        });

        // Local wipe + round-trip through the RP-initiated logout endpoint
        // with the retained id_token_hint (the admin-console pages/logout.vue
        // pattern), landing back on the account root — which then shows the
        // sign-in state.
        const signOut = async () => {
            const idTokenHint = store.idToken ?? undefined;
            const { realmId } = store;

            await store.logout();

            window.location.href = buildEndSessionURL({
                baseURL: config.apiUrl,
                idTokenHint,
                realmId,
                postLogoutRedirectUri: `${window.location.origin}${config.basePath}`,
            });
        };

        return {
            isDark,
            authenticated,
            userName,
            signOutLabel,
            signOut,
        };
    },
});
</script>
<template>
    <!--
        <AAuthApp> is the shared app shell (mirrored by the auth pages and
        client-admin-console's auth layout): the <VCToastProvider> root every
        descendant <VCToaster>/toast primitive needs, the gadget cluster
        (color mode + language) and the toaster viewport fed by useToast().

        The user chip + sign-out ride the SAME gadget cluster (the `gadgets`
        slot), so the page has one top bar instead of a second header row.

        <VCAlertDialogProvider> is the single host that renders the
        confirmations useAlertDialog() queues on the app-level manager
        (installOverlays). AAuthApp deliberately does not carry one — the
        logged-out chrome never confirms anything — but this app's session /
        consent deletes do, and without the host the dialog never opens
        (mirrors the admin console's layouts/default.vue placement).
    -->
    <AAuthApp v-model:dark="isDark">
        <template #gadgets>
            <template v-if="authenticated">
                <span
                    v-if="userName"
                    class="a-auth-gadget a-auth-gadget--static gap-1 hidden sm:inline-flex"
                >
                    <VCIcon name="fa6-solid:circle-user" />
                    {{ userName }}
                </span>
                <button
                    type="button"
                    class="a-auth-gadget"
                    :title="signOutLabel"
                    :aria-label="signOutLabel"
                    @click.prevent="signOut"
                >
                    <VCIcon name="fa6-solid:right-from-bracket" />
                </button>
            </template>
        </template>

        <RouterView />
        <VCAlertDialogProvider />
    </AAuthApp>
</template>
