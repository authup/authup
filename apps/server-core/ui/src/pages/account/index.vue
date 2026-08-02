<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import {
    AAccountShell,
    AAuthShell,
    ARealmGrid,
    AWorkflowDisabledNotice,
    StoreAuthStatus,
    buildAuthorizeURL,
    buildEndSessionURL,
    createPKCE,
    createState,
    injectStore,
    saveAuthorizationRequest,
    useTranslations,
} from '@authup/client-web-kit';
import type { AAccountShellNavItem } from '@authup/client-web-kit';
import type { Realm } from '@authup/core-kit';
import { CLIENT_ACCOUNT_CONSOLE_NAME } from '@authup/core-kit';
import type { StatusResponseFeatures } from '@authup/core-http-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { OAuth2ErrorCode } from '@authup/specs';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { storeToRefs } from 'pinia';
import {
    computed,
    defineComponent,
    onMounted,
    ref,
    watchEffect,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBasePath } from '../../base-path';
import { injectPayload } from '../../di';
import { useAccountToasts } from './utils';

export default defineComponent({
    components: {
        AAccountShell,
        AAuthShell,
        ARealmGrid,
        AWorkflowDisabledNotice,
        VCButton,
        VCIcon,
    },
    setup() {
        const app = injectPayload<{
            features?: StatusResponseFeatures,
            realmId?: string,
        }>();

        const withBasePath = useBasePath();
        const route = useRoute();
        const router = useRouter();
        const toasts = useAccountToasts();

        const store = injectStore();
        const { status } = storeToRefs(store);

        // Auth-gated content cannot SSR (auth is header-only; the session
        // lives in first-party cookies the render never sees), so the server
        // and the first client render show a neutral loading state — the
        // status-driven UI appears once mounted.
        const mounted = ref(false);
        onMounted(() => {
            mounted.value = true;
        });

        const errorCode = computed(() => (
            typeof route.query.error === 'string' ? route.query.error : undefined
        ));
        // An accessPolicyId bound to the account-console client denies the
        // code flow with `access_denied` — surfaced as a readable page state
        // instead of a dead redirect. It wins over an authenticated store:
        // the login on the hosted authorize page establishes the shared
        // cookie session even when consent is then denied.
        const denied = computed(() => errorCode.value === OAuth2ErrorCode.ACCESS_DENIED);

        const authenticated = computed(() => status.value === StoreAuthStatus.AUTHENTICATED);
        const unauthenticated = computed(() => status.value === StoreAuthStatus.UNAUTHENTICATED);

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.ACCOUNT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.AUTHENTICATOR },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.APPLICATIONS },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.SESSION,
                count: 2,
            },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.PASSWORD },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCOUNT_SIGN_IN_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCESS_DENIED_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCESS_DENIED_TEXT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.USE_ANOTHER_ACCOUNT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.LOGIN },
        ]);

        const items = computed<AAccountShellNavItem[]>(() => [
            {
                key: 'overview',
                label: translations.account,
                icon: 'fa6-solid:bars',
                link: { to: '/account' },
                active: route.path === '/account',
            },
            {
                key: 'password',
                label: translations.password,
                icon: 'fa6-solid:key',
                link: { to: '/account/password' },
                active: route.path === '/account/password',
            },
            {
                key: 'authenticators',
                label: translations.authenticator,
                icon: 'fa6-solid:shield-halved',
                link: { to: '/account/authenticators' },
                active: route.path === '/account/authenticators',
            },
            {
                key: 'sessions',
                label: translations.session,
                icon: 'fa6-solid:desktop',
                link: { to: '/account/sessions' },
                active: route.path === '/account/sessions',
            },
            {
                key: 'applications',
                label: translations.applications,
                icon: 'fa6-solid:grip',
                link: { to: '/account/applications' },
                active: route.path === '/account/applications',
            },
        ]);

        // Full auth-code + PKCE flow against the per-realm `account-console`
        // client (plan 080): per-app session attribution + access-policy
        // enforcement. The code lands back on this path; the router guard
        // exchanges it with the saved PKCE parameters.
        const kick = async (realmKey: string) => {
            try {
                const pkce = await createPKCE();
                const state = createState();

                const redirectUri = `${window.location.origin}${window.location.pathname}`;

                saveAuthorizationRequest({
                    state,
                    code_verifier: pkce.code_verifier,
                    redirect_uri: redirectUri,
                    client_id: CLIENT_ACCOUNT_CONSOLE_NAME,
                    realm_id: realmKey,
                });

                window.location.href = buildAuthorizeURL({
                    baseURL: (app.config.baseURL as string) || window.location.origin,
                    clientId: CLIENT_ACCOUNT_CONSOLE_NAME,
                    realmId: realmKey,
                    redirectUri,
                    scope: 'global openid',
                    state,
                    codeChallenge: pkce.code_challenge,
                    codeChallengeMethod: pkce.code_challenge_method,
                });
            } catch (e) {
                await toasts.error(e);
            }
        };

        const handleRealmSelect = (realm: Realm) => kick(realm.id);

        // A `?realmId=` hint (deep link from a realm-specific app) skips the
        // realm chooser. Suppressed while an error param is present so a
        // denial cannot loop back into the flow without a user action.
        const kicked = ref(false);
        watchEffect(() => {
            if (!mounted.value ||
                kicked.value ||
                errorCode.value ||
                status.value !== StoreAuthStatus.UNAUTHENTICATED) {
                return;
            }

            const hint = app.data.realmId;
            if (hint) {
                kicked.value = true;
                Promise.resolve().then(() => kick(hint));
            }
        });

        // Local wipe + round-trip through the RP-initiated logout endpoint
        // with the retained id_token_hint (the admin-console pages/logout.vue
        // pattern), landing back here — which then shows the sign-in state.
        const signOut = async () => {
            const idTokenHint = store.idToken ?? undefined;
            const { realmId } = store;

            await store.logout();

            window.location.href = buildEndSessionURL({
                baseURL: (app.config.baseURL as string) || window.location.origin,
                idTokenHint,
                realmId,
                postLogoutRedirectUri: `${window.location.origin}${withBasePath('/account')}`,
            });
        };

        // Escape hatch on the denial card: drop the session established by
        // the hosted login, clear the error param, land on the realm chooser.
        const useAnotherAccount = async () => {
            await store.logout();
            await router.replace({ path: route.path });
        };

        const retry = async () => {
            await router.replace({ path: route.path });
        };

        return {
            data: app.data,
            mounted,
            denied,
            authenticated,
            unauthenticated,
            items,
            translations,
            handleRealmSelect,
            signOut,
            useAnotherAccount,
            retry,
        };
    },
});
</script>
<template>
    <template v-if="data.features && data.features.accountConsole">
        <AAccountShell
            v-if="mounted && authenticated && !denied"
            :items="items"
            @sign-out="signOut"
        >
            <RouterView />
        </AAccountShell>
        <AAuthShell v-else>
            <template v-if="mounted && denied">
                <div class="text-center flex flex-col gap-2">
                    <h1 class="font-bold">
                        {{ translations.accessDeniedTitle }}
                    </h1>
                    <p>
                        {{ translations.accessDeniedText }}
                    </p>
                    <div class="mt-2 flex flex-col gap-2">
                        <VCButton
                            type="button"
                            color="primary"
                            class="w-full"
                            @click.prevent="useAnotherAccount"
                        >
                            {{ translations.useAnotherAccount }}
                        </VCButton>
                        <VCButton
                            type="button"
                            variant="outline"
                            class="w-full"
                            @click.prevent="retry"
                        >
                            {{ translations.login }}
                        </VCButton>
                    </div>
                </div>
            </template>
            <template v-else-if="mounted && unauthenticated">
                <div class="text-center">
                    {{ translations.accountSignInIntro }}
                </div>
                <ARealmGrid @select="handleRealmSelect" />
            </template>
            <template v-else>
                <div class="text-center p-3">
                    <VCIcon
                        name="fa6-solid:spinner"
                        class="animate-spin text-2xl"
                    />
                </div>
            </template>
        </AAuthShell>
    </template>
    <AAuthShell v-else>
        <AWorkflowDisabledNotice />
    </AAuthShell>
</template>
