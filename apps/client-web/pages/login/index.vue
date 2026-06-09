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
import {
    definePageMeta,
    useToast,
} from '#imports';
import {
    defineNuxtComponent,
    useRoute,
    useRuntimeConfig,
} from '#app';
import LoginSVG from '../../components/svg/LoginSVG';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    components: {
        ARealmGrid,
        LoginSVG,
    },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_OUT]: true });

        const toast = useToast();
        const runtimeConfig = useRuntimeConfig();
        const route = useRoute();

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

                const target = typeof route.query.redirect === 'string' ?
                    route.query.redirect :
                    undefined;

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
                toast.show({
                    variant: 'warning',
                    body: e instanceof Error ? e.message : 'The login could not be initiated.',
                });
            }
        };

        return {
            handleSelect,
            translations,
        };
    },
});
</script>
<template>
    <div class="login-entry">
        <div
            class="login-aurora"
            aria-hidden="true"
        />

        <div class="login-content container">
            <div class="text-center login-hero">
                <LoginSVG :height="220" />
                <h1 class="login-title">
                    {{ translations.loginTitle }}
                </h1>
                <p class="login-subtitle">
                    {{ translations.loginSubtitle }}
                </p>
            </div>

            <ARealmGrid @select="handleSelect" />
        </div>
    </div>
</template>
<style scoped>
.login-entry {
    position: relative;
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.login-aurora {
    position: absolute;
    inset: -20%;
    z-index: 0;
    pointer-events: none;
    background:
        radial-gradient(
            38% 48% at 22% 22%,
            color-mix(in oklab, var(--authup-periwinkle, #6d7fcc) 50%, transparent),
            transparent 70%
        ),
        radial-gradient(
            42% 52% at 80% 28%,
            color-mix(in oklab, var(--authup-rose, #cc8181) 38%, transparent),
            transparent 70%
        ),
        radial-gradient(
            52% 60% at 50% 92%,
            color-mix(in oklab, var(--authup-periwinkle, #6d7fcc) 32%, transparent),
            transparent 70%
        );
    filter: blur(70px);
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
