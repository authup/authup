<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import type { Client, OAuth2AuthorizationCodeRequest, Scope } from '@authup/core-kit';
import { OAuth2AuthorizationPrompt, OAuth2ErrorCode } from '@authup/specs';
import type { PropType } from 'vue';
import {
    computed,
    defineComponent,
    onMounted,
    ref,
} from 'vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { ITranslateT } from '@ilingo/vue';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import {
    extractErrorContext,
    injectHTTPClient,
    useTranslation,
    useTranslations,
    useTranslationsForNamespace,
} from '../../../core';
import AuthorizeScopes from './AuthorizeScopes.vue';
import AuthorizeText from './AuthorizeText.vue';

export default defineComponent({
    components: {
        AuthorizeScopes,
        AuthorizeText,
        ITranslateT,
        VCButton,
        VCIcon,
    },
    props: {
        client: {
            type: Object as PropType<Client>,
            required: true,
        },
        scopes: { type: Array as PropType<Scope[]> },
        codeRequest: {
            type: Object as PropType<OAuth2AuthorizationCodeRequest>,
            required: true,
        },
        // The signed-in identity's display name — renders the "Signed in as X —
        // Not you?" switch affordance above the consent actions when non-empty.
        identityName: { type: String, default: '' },
        // Silent (prompt=none) mode: an auto-consent failure must NOT drop to the
        // interactive manual-consent UI (that would violate the zero-UI
        // contract). Instead emit `failed` so the parent redirects an OIDC error.
        silent: { type: Boolean, default: false },
        // Whether the redirect_uri matched a registered client pattern
        // (server-verified). abort()'s access_denied redirect is gated on it —
        // same as every other redirect in the ladder. Fail-closed default.
        redirectUriVerified: { type: Boolean, default: false },
        // Persisted consent rows cover every requested scope (plan 055) —
        // allows auto-consent for non-built_in clients. Fail-closed default.
        consentGranted: { type: Boolean, default: false },
    },
    emits: ['loginRequired', 'switch', 'failed'],
    setup(props, { emit }) {
        const httpClient = injectHTTPClient();

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.APPLICATION,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ABORT,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.AUTHORIZE,
            },
        ]);

        const translationsClient = useTranslationsForNamespace(
            TranslatorTranslationNamespace.CLIENT,
            [
                { key: TranslatorTranslationClientKey.ACTIVE_SINCE },
                { key: TranslatorTranslationClientKey.PRIVACY_POLICY },
                { key: TranslatorTranslationClientKey.TERMS_OF_SERVICE },
            ],
        );

        const signedInAsLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.SIGNED_IN_AS,
            data: { name: computed(() => props.identityName) },
        });

        const notYouLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.NOT_YOU,
        });

        const abortedText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.AUTHORIZE_ABORTED,
        });

        const accessDeniedTitle = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.ACCESS_DENIED_TITLE,
        });

        const accessDeniedText = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.ACCESS_DENIED_TEXT,
        });

        // Terminal denial: the server's access policy rejected this identity
        // for the client (unverified-redirect case — a verified denial comes
        // back as 200 { url } and navigates). No retry: a re-POST re-denies.
        const accessDenied = ref<boolean>(false);

        // An abort against an unverified redirect_uri can't navigate — the
        // template renders a terminal "aborted" notice instead.
        const aborted = ref<boolean>(false);

        const abort = () => {
            // Only redirect access_denied to a redirect_uri that matched a
            // registered client pattern — for a misconfigured pattern-less
            // client this click would otherwise be an open redirect.
            if (!props.redirectUriVerified) {
                aborted.value = true;
                return;
            }

            const url = new URL(`${props.codeRequest.redirect_uri}`);
            url.searchParams.set('error', OAuth2ErrorCode.ACCESS_DENIED);
            url.searchParams.set(
                'error_description',
                'The resource owner or authorization server denied the request',
            );

            if (props.codeRequest.state) {
                url.searchParams.set('state', props.codeRequest.state);
            }

            if (typeof window !== 'undefined') {
                window.location.href = url.href;
            }
        };

        // Tracks an auto-consent failure so the template can fall back from the
        // bare spinner to the full consent UI (giving the user a retry path).
        const autoConsentFailed = ref<boolean>(false);

        const authorize = async () => {
            autoConsentFailed.value = false;

            try {
                // Forward the whole code request so the POST /authorize
                // re-verification sees every parameter the GET did — notably
                // code_challenge / code_challenge_method (a public client is
                // rejected without them), plus nonce / realm_id. Only
                // client_id is overridden with the resolved client id.
                const response = await httpClient
                    .authorize
                    .confirm({
                        ...props.codeRequest,
                        client_id: props.client.id,
                    });

                const { url } = response;

                if (typeof window !== 'undefined') {
                    window.location.href = url;
                }
            } catch (e) {
                // Fall back to re-authentication (rather than the manual consent
                // screen, whose retry would re-POST the same dead bearer forever)
                // when the request can never succeed as-is:
                //  - login_required body error: the server rejected the identity
                //    for this client (realm mismatch — e.g. a stale SSR bundle
                //    that skipped the client-side realm gate, or a race).
                //  - HTTP 401: the bearer is dead/expired (a mid-flow session
                //    sweep, a sibling-tab logout, or an account switch).
                // In silent (prompt=none) mode the parent's handleLoginRequired
                // turns this into a login_required OIDC redirect, never UI.
                const { status, data } = extractErrorContext(e);
                if (
                    status === 401 ||
                    data?.error === OAuth2ErrorCode.LOGIN_REQUIRED
                ) {
                    emit('loginRequired');
                    return;
                }

                // Silent request: never render interactive consent on failure —
                // the parent redirects an OIDC error (interaction_required).
                if (props.silent) {
                    emit('failed');
                    return;
                }

                if (data?.error === OAuth2ErrorCode.ACCESS_DENIED) {
                    accessDenied.value = true;
                    return;
                }

                autoConsentFailed.value = true;
            }
        };

        // Auto-consent for built-in clients (e.g. the per-realm `web` client)
        // and for subjects whose persisted consent already covers every
        // requested scope (plan 055). `built_in` is a provisioning-only trust
        // boundary — the client validator strips it on create/update, so no
        // API caller can self-assign it. Skipping the scope-consent step is
        // therefore safe; user/admin-created clients are never built_in and
        // show consent until a prior approval covers the request.
        // prompt=consent (OIDC §3.1.2.1) forces the consent screen regardless
        // — union/keep happens server-side on the re-approval POST.
        const autoConsent = computed<boolean>(() => {
            if (!props.client.built_in && !props.consentGranted) {
                return false;
            }

            const prompts = props.codeRequest.prompt ?
                props.codeRequest.prompt.split(' ') :
                [];
            return !prompts.includes(OAuth2AuthorizationPrompt.CONSENT);
        });

        // Show the spinner only while an auto-consent submit is in flight. If it
        // fails, drop to the manual consent UI so the user can retry instead of
        // staring at a frozen spinner.
        const showSpinner = computed<boolean>(() => autoConsent.value && !autoConsentFailed.value);

        onMounted(() => {
            if (autoConsent.value) {
                authorize();
            }
        });

        return {
            authorize,
            abort,
            aborted,
            abortedText,
            accessDenied,
            accessDeniedTitle,
            accessDeniedText,
            autoConsent,
            showSpinner,
            translationsDefault,
            translationsClient,
            signedInAsLabel,
            notYouLabel,
            switchAccount: () => emit('switch'),
        };
    },
});
</script>
<template>
    <div
        v-if="accessDenied"
        class="flex flex-col gap-2"
    >
        <div class="text-center">
            <h1 class="font-bold">
                {{ accessDeniedTitle }}
            </h1>
        </div>
        <AuthorizeText
            :is-error="true"
            :message="accessDeniedText"
        />
    </div>
    <AuthorizeText
        v-else-if="aborted"
        :message="abortedText"
    />
    <div
        v-else-if="showSpinner"
        class="text-center"
    >
        <VCIcon name="fa6-solid:spinner" />
    </div>
    <div
        v-else
        class="flex-col flex gap-2"
    >
        <div class="text-center">
            <h5 class="text-fg-muted mb-1">
                {{ translationsDefault.application }}
            </h5>
            <h1 class="font-bold">
                {{ client.name }}
            </h1>
        </div>

        <AuthorizeScopes
            :client="client"
            :scopes-requested="codeRequest.scope"
            :scopes-available="scopes"
        />

        <div class="mt-auto">
            <div class="flex flex-row">
                <div>
                    <VCIcon name="fa6-solid:link" />
                </div>
                <div class="ms-1">
                    <small>
                        <ITranslateT path="authupClient.onceAuthorizedRedirect">
                            <template #target>
                                <strong>{{ codeRequest.redirect_uri }}</strong>
                            </template>
                        </ITranslateT>
                    </small>
                </div>
            </div>
            <div class="flex flex-row">
                <div>
                    <VCIcon name="fa6-solid:lock" />
                </div>
                <div class="ms-1">
                    <small>
                        <ITranslateT
                            path="authupClient.governedBy"
                            :data="{ client: client.name }"
                        >
                            <template #privacyPolicy>
                                {{ translationsClient.privacyPolicy }}
                            </template>
                            <template #termsOfService>
                                {{ translationsClient.termsOfService }}
                            </template>
                        </ITranslateT>
                    </small>
                </div>
            </div>
            <div class="flex flex-row">
                <div>
                    <VCIcon name="fa6-solid:clock" />
                </div>
                <div class="ms-1">
                    <small>
                        {{ translationsClient.activeSince }} {{ client.created_at }}
                    </small>
                </div>
            </div>
        </div>

        <div
            v-if="identityName"
            class="text-center"
        >
            <small class="text-fg-muted">
                {{ signedInAsLabel }} —
                <button
                    type="button"
                    class="underline bg-transparent border-0 p-0 cursor-pointer text-inherit"
                    @click.prevent="switchAccount"
                >{{ notYouLabel }}</button>
            </small>
        </div>

        <div class="flex flex-wrap -mx-2">
            <div class="w-6/12 px-2">
                <VCButton
                    type="button"
                    color="neutral"
                    variant="soft"
                    class="w-full"
                    @click.prevent="abort"
                >
                    {{ translationsDefault.abort }}
                </VCButton>
            </div>
            <div class="w-6/12 px-2">
                <VCButton
                    type="button"
                    color="primary"
                    class="w-full"
                    @click.prevent="authorize"
                >
                    {{ translationsDefault.authorize }}
                </VCButton>
            </div>
        </div>
    </div>
</template>
