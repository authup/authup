<script lang="ts">
/* global window */
import type { Realm } from '@authup/core-kit';
import {
    ARealmGrid,
    buildAuthorizeURL,
    buildConsoleLoginURL,
    createPKCE,
    createState,
    saveAuthorizationRequest,
    useTranslations,
} from '@authup/client-web-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { OAuth2ErrorCode } from '@authup/specs';
import { VCAlert } from '@vuecs/elements';
import { computed, defineComponent, ref } from 'vue';
import { useRoute } from 'vue-router';
import LogoSVG from '../../components/svg/LogoSVG';
import { useErrorToast } from '../../composables/error';
import { injectAdminConsoleConfig } from '../../di';
import { saveLoginRedirect } from '../../redirect';

export default defineComponent({
    components: {
        ARealmGrid,
        LogoSVG,
        VCAlert,
    },
    setup() {
        const errorToast = useErrorToast();
        const config = injectAdminConsoleConfig();
        const route = useRoute();

        const realmGrid = ref<{ reset: () => void } | null>(null);

        // A refused server-side callback (cookie mode) lands here with a
        // closed set of error markers: `access_denied` is an accessPolicyId
        // on the admin-console client, everything else a failed redemption.
        const errorCode = computed(() => (
            typeof route.query.error === 'string' ? route.query.error : undefined
        ));
        const denied = computed(() => errorCode.value === OAuth2ErrorCode.ACCESS_DENIED);
        const failed = computed(() => !!errorCode.value && !denied.value);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.LOGIN_TITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.LOGIN_SUBTITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.LOGIN_FAILED,
            },
            {
                namespace: TranslatorTranslationNamespace.CLIENT,
                key: TranslatorTranslationClientKey.ACCESS_DENIED_TEXT,
            },
        ]);

        const handleSelect = async (realm: Realm) => {
            try {
                const { redirect } = route.query;

                // Cookie mode (plan 088): the server mints PKCE + state where
                // only its callback can read them, so no verifier and no
                // token ever reaches this JavaScript. The destination rides a
                // single-use stash, since the callback lands on the root.
                if (config.cookieSession) {
                    saveLoginRedirect(redirect);

                    window.location.href = buildConsoleLoginURL({
                        baseURL: config.apiUrl,
                        console: 'admin',
                        realmId: realm.id,
                    });

                    return;
                }

                // Standalone hosting: the client-side PKCE flow. The
                // post-login destination rides in the callback URI's own
                // query, so the authorization server carries it back (it
                // appends `code`/`state` to whatever query is already there).
                const pkce = await createPKCE();
                const state = createState();

                const callback = new URL(`${config.basePath}/login/callback`, window.location.origin);
                if (typeof redirect === 'string' && redirect) {
                    callback.searchParams.set('redirect', redirect);
                }

                const redirectUri = callback.href;

                saveAuthorizationRequest({
                    state,
                    code_verifier: pkce.code_verifier,
                    redirect_uri: redirectUri,
                    client_id: config.clientId,
                    realm_id: realm.id,
                });

                window.location.href = buildAuthorizeURL({
                    baseURL: config.apiUrl,
                    clientId: config.clientId,
                    realmId: realm.id,
                    redirectUri,
                    scope: 'global openid',
                    state,
                    codeChallenge: pkce.code_challenge,
                    codeChallengeMethod: pkce.code_challenge_method,
                });
            } catch (e) {
                // Drop the grid's auto-select skeleton so the user isn't
                // stranded when the redirect glue fails.
                realmGrid.value?.reset();
                await errorToast.show(e);
            }
        };

        return {
            denied,
            failed,
            handleSelect,
            translations,
            realmGrid,
        };
    },
});
</script>
<template>
    <div class="login-entry">
        <div
            class="a-auth-shell-aurora login-aurora"
            aria-hidden="true"
        />

        <div class="login-content mx-auto w-full max-w-screen-lg px-4">
            <div class="text-center login-hero">
                <LogoSVG
                    class="mx-auto"
                    :width="96"
                    :height="96"
                />
                <h1 class="login-title">
                    {{ translations.loginTitle }}
                </h1>
                <p class="login-subtitle">
                    {{ translations.loginSubtitle }}
                </p>
            </div>

            <VCAlert
                v-if="denied"
                color="warning"
                variant="soft"
                class="mb-3"
            >
                {{ translations.accessDeniedText }}
            </VCAlert>
            <VCAlert
                v-else-if="failed"
                color="warning"
                variant="soft"
                class="mb-3"
            >
                {{ translations.loginFailed }}
            </VCAlert>

            <!--
                A refused callback lands here with its error marker. The grid
                auto-selects a lone realm, which would kick straight back into
                the flow that was just refused (an accessPolicyId denial loops
                forever on a single-realm deployment), so a refusal waits for
                a click.
            -->
            <ARealmGrid
                ref="realmGrid"
                :auto-select-single="!denied && !failed"
                @select="handleSelect"
            />
        </div>
    </div>
</template>
<style scoped>
.login-entry {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 4rem 1rem;
}

/* Gradients / blur / positioning come from the shared `.a-auth-shell-aurora`
   rule (`@authup/client-web-kit-theme`), the single source for the brand
   backdrop so a palette change can't drift this page from the SSR auth pages.
   Login keeps only its slightly stronger opacity + the drift flourish. */
.login-aurora {
    opacity: 0.65;
    animation: login-aurora-drift 18s ease-in-out infinite alternate;
}

.login-content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 720px;
}

.login-hero {
    margin-bottom: 2rem;
}

.login-title {
    margin-top: 0.5rem;
    font-weight: 700;
    font-size: 2rem;
}

.login-subtitle {
    margin-top: 0.25rem;
    color: var(--vc-color-fg-muted);
}

@keyframes login-aurora-drift {
    0% {
        transform: translate3d(-2%, -1%, 0) scale(1);
    }

    100% {
        transform: translate3d(2%, 1%, 0) scale(1.08);
    }
}

@media (prefers-reduced-motion: reduce) {
    .login-aurora {
        animation: none;
    }
}
</style>
