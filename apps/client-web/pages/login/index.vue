<script lang="ts">
/* global window */
import type { Realm } from '@authup/core-kit';
import { CLIENT_WEB_NAME } from '@authup/core-kit';
import {
    ARealmGrid,
    buildAuthorizeURL,
    createPKCE,
    createState,
    saveAuthorizationRequest,
    useTranslations,
} from '@authup/client-web-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { ref } from 'vue';
import {
    definePageMeta,
    useErrorToast,
} from '#imports';
import {
    defineNuxtComponent,
    useRoute,
    useRuntimeConfig,
} from '#app';
import LoginHeroSVG from '../../components/svg/LoginHeroSVG.vue';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    components: {
        ARealmGrid,
        LoginHeroSVG,
    },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
            layout: 'auth',
        });

        const errorToast = useErrorToast();
        const runtimeConfig = useRuntimeConfig();
        const route = useRoute();

        const realmGrid = ref<{ reset: () => void } | null>(null);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.LOGIN_TITLE,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.LOGIN_SUBTITLE,
            },
        ]);

        const handleSelect = async (realm: Realm) => {
            try {
                const pkce = await createPKCE();
                const state = createState();

                const redirectUri = `${window.location.origin}/login/callback`;

                // Preserve the post-login destination AND any sibling query
                // params on the login URL (e.g. /login?redirect=/users&invite=x
                // → /users?invite=x), matching the pre-realm-picker behaviour.
                const { redirect, ...rest } = route.query;
                let target: string | undefined;
                if (typeof redirect === 'string') {
                    const url = new URL(redirect, window.location.origin);
                    for (const [key, value] of Object.entries(rest)) {
                        if (Array.isArray(value)) {
                            for (const entry of value) {
                                if (entry != null) {
                                    url.searchParams.append(key, entry);
                                }
                            }
                        } else if (value != null) {
                            url.searchParams.set(key, value);
                        }
                    }
                    target = `${url.pathname}${url.search}${url.hash}`;
                }

                saveAuthorizationRequest({
                    state,
                    code_verifier: pkce.code_verifier,
                    redirect_uri: redirectUri,
                    client_id: CLIENT_WEB_NAME,
                    realm_id: realm.id,
                    target,
                });

                window.location.href = buildAuthorizeURL({
                    baseURL: runtimeConfig.public.apiUrl as string,
                    clientId: CLIENT_WEB_NAME,
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

        <div class="login-content container">
            <div class="text-center login-hero">
                <LoginHeroSVG :height="150" />
                <h1 class="login-title">
                    {{ translations.loginTitle }}
                </h1>
                <p class="login-subtitle">
                    {{ translations.loginSubtitle }}
                </p>
            </div>

            <ARealmGrid
                ref="realmGrid"
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
