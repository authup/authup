<script lang="ts">
/* global window */
import type { Realm } from '@authup/core-kit';
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
import LogoSVG from '../../components/svg/LogoSVG';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    components: {
        ARealmGrid,
        LogoSVG,
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

                // The post-login destination rides in the callback URI's own
                // query, so the authorization server carries it back to us
                // (it appends `code`/`state` to whatever query is already
                // there). Nothing about it is authup-specific, which is the
                // point: any client can do the same with its own callback.
                //
                // Only `redirect` is forwarded. The predecessor also folded
                // every sibling param on the login URL into the destination
                // (`/login?redirect=/users&invite=x` -> `/users?invite=x`),
                // which nothing in the app has ever produced: the routing
                // interceptor and the session-expiry plugin each emit a lone
                // `redirect`. Put it in the `redirect` value if you need it.
                const callback = new URL('/login/callback', window.location.origin);
                const { redirect } = route.query;
                if (typeof redirect === 'string' && redirect) {
                    callback.searchParams.set('redirect', redirect);
                }

                const redirectUri = callback.href;

                const clientId = runtimeConfig.public.clientId as string;

                saveAuthorizationRequest({
                    state,
                    code_verifier: pkce.code_verifier,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    realm_id: realm.id,
                });

                window.location.href = buildAuthorizeURL({
                    baseURL: runtimeConfig.public.apiUrl as string,
                    clientId,
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
