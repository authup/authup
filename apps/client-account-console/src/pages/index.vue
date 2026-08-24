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
    buildConsoleLoginURL,
    createPKCE,
    createState,
    injectStore,
    saveAuthorizationRequest,
    useTranslations,
} from '@authup/client-web-kit';
import type { AAccountShellNavItem } from '@authup/client-web-kit';
import type { Realm } from '@authup/core-kit';
import { CLIENT_ACCOUNT_CONSOLE_NAME } from '@authup/core-kit';
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
import { VCAlert } from '@vuecs/elements';
import { VCIcon } from '@vuecs/icon';
import { storeToRefs } from 'pinia';
import {
    computed,
    defineComponent,
    ref,
    watchEffect,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { injectAccountConsoleConfig } from '../di';
import { saveAccountConsoleRef, useAccountConsoleRef } from '../ref';
import { useAccountToasts } from './utils';

export default defineComponent({
    components: {
        AAccountShell,
        AAuthShell,
        ARealmGrid,
        AWorkflowDisabledNotice,
        VCAlert,
        VCButton,
        VCIcon,
    },
    setup() {
        const config = injectAccountConsoleConfig();

        const route = useRoute();
        const router = useRouter();
        const toasts = useAccountToasts();

        const store = injectStore();
        const { status } = storeToRefs(store);

        const errorCode = computed(() => (
            typeof route.query.error === 'string' ? route.query.error : undefined
        ));
        // An accessPolicyId bound to the account-console client denies the
        // code flow with `access_denied` — surfaced as a readable page state
        // instead of a dead redirect. It wins over an authenticated store:
        // the login on the hosted authorize page establishes the shared
        // cookie session even when consent is then denied.
        const denied = computed(() => errorCode.value === OAuth2ErrorCode.ACCESS_DENIED);
        // Any other error marker (a failed/replayed code exchange) renders
        // the sign-in state with a localized notice.
        const failed = computed(() => !!errorCode.value && !denied.value);

        const authenticated = computed(() => status.value === StoreAuthStatus.AUTHENTICATED);
        const unauthenticated = computed(() => status.value === StoreAuthStatus.UNAUTHENTICATED);

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.ACCOUNT },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.AUTHENTICATOR },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.APPLICATIONS },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.CONNECTED_ACCOUNTS },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.SESSION,
                count: 2,
            },
            { namespace: TranslatorTranslationNamespace.FIELD, key: TranslatorTranslationFieldKey.PASSWORD },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCOUNT_SIGN_IN_INTRO },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.LOGIN_FAILED },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCESS_DENIED_TITLE },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.ACCESS_DENIED_TEXT },
            { namespace: TranslatorTranslationNamespace.CLIENT, key: TranslatorTranslationClientKey.USE_ANOTHER_ACCOUNT },
            { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.LOGIN },
        ]);

        // The trusted value, never the URL. `?ref=` is written into links
        // for visibility; reading it back would bypass the server's
        // allowlist.
        const backRef = useAccountConsoleRef();

        const items = computed<AAccountShellNavItem[]>(() => {
            // VCLink merges a separate `query` prop into a string `to`
            // (@vuecs/link's `extendLinkWithQuery`), so this stays within
            // `LinkProps`'s `to?: string` shape instead of the wider
            // route-location-object form the component also accepts but
            // the type does not.
            const query = backRef.value ? { ref: backRef.value } : undefined;

            return [
                {
                    key: 'overview',
                    label: translations.account,
                    icon: 'fa6-solid:bars',
                    link: { to: '/', query },
                    active: route.path === '/',
                },
                {
                    key: 'password',
                    label: translations.password,
                    icon: 'fa6-solid:key',
                    link: { to: '/password', query },
                    active: route.path === '/password',
                },
                {
                    key: 'authenticators',
                    label: translations.authenticator,
                    icon: 'fa6-solid:shield-halved',
                    link: { to: '/authenticators', query },
                    active: route.path === '/authenticators',
                },
                {
                    key: 'connected-accounts',
                    label: translations.connectedAccounts,
                    icon: 'fa6-solid:link',
                    link: { to: '/connected-accounts', query },
                    active: route.path === '/connected-accounts',
                },
                {
                    key: 'sessions',
                    label: translations.session,
                    icon: 'fa6-solid:desktop',
                    link: { to: '/sessions', query },
                    active: route.path === '/sessions',
                },
                {
                    key: 'applications',
                    label: translations.applications,
                    icon: 'fa6-solid:grip',
                    link: { to: '/applications', query },
                    active: route.path === '/applications',
                },
            ];
        });

        // Full auth-code + PKCE flow against the per-realm `account-console`
        // client (plan 080): per-app session attribution + access-policy
        // enforcement. The code lands back on this path; the router guard
        // exchanges it with the saved PKCE parameters.
        //
        // In cookie mode the whole flow is server-side instead (plan 088):
        // `GET /account/login` mints the PKCE pair and the state where only
        // the callback can read them, so no verifier and no token ever
        // reaches this JavaScript. The client-side path below stays for a
        // standalone host on a foreign origin, which can never present the
        // `SameSite=Strict` session cookie.
        const kick = async (realmKey: string) => {
            try {
                // The redirect_uri carries no query string either way, so the
                // back link rides the stash on both paths. Untouched by the
                // mode: it never depended on the exchange happening here.
                saveAccountConsoleRef(backRef.value);

                if (config.cookieSession) {
                    window.location.href = buildConsoleLoginURL({
                        baseURL: config.apiUrl,
                        realmId: realmKey,
                    });

                    return;
                }

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
                    baseURL: config.apiUrl,
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
            if (kicked.value ||
                errorCode.value ||
                status.value !== StoreAuthStatus.UNAUTHENTICATED) {
                return;
            }

            const hint = typeof route.query.realmId === 'string' ?
                route.query.realmId :
                undefined;
            if (hint) {
                kicked.value = true;
                Promise.resolve().then(() => kick(hint));
            }
        });

        // Sign-out lives in App.vue's gadget-slot content (the single
        // top-right cluster), not here.

        // Escape hatch on the denial card: drop the session established by
        // the hosted login, clear the error param, land on the realm chooser.
        const useAnotherAccount = async () => {
            await store.logout();
            await router.replace({ path: route.path });
        };

        // Re-run the code flow instead of merely clearing the error marker:
        // the hosted login establishes the shared cookie session even when
        // consent is denied, so a bare marker-clear would render the shell
        // and sidestep the client's access policy. The session realm drives
        // the kick; without one (unauthenticated store) the sign-in state
        // renders and the realm chooser takes over.
        const retry = async () => {
            await router.replace({ path: route.path });

            const { realmId } = store;
            if (realmId) {
                await kick(realmId);
            }
        };

        return {
            enabled: config.enabled,
            denied,
            failed,
            authenticated,
            unauthenticated,
            items,
            backRef,
            translations,
            handleRealmSelect,
            useAnotherAccount,
            retry,
        };
    },
});
</script>
<template>
    <template v-if="enabled">
        <AAccountShell
            v-if="authenticated && !denied"
            :items="items"
            :back-link="backRef"
        >
            <RouterView />
        </AAccountShell>
        <AAuthShell v-else>
            <template v-if="denied">
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
            <template v-else-if="unauthenticated">
                <VCAlert
                    v-if="failed"
                    color="warning"
                    variant="soft"
                >
                    {{ translations.loginFailed }}
                </VCAlert>
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
