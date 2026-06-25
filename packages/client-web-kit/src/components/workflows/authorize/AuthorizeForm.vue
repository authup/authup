<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
/* global window */
import type { Client, OAuth2AuthorizationCodeRequest, Scope } from '@authup/core-kit';
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
import { injectHTTPClient, useTranslations, useTranslationsForNamespace } from '../../../core';
import AuthorizeScopes from './AuthorizeScopes.vue';

export default defineComponent({
    components: {
        AuthorizeScopes,
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
    },
    setup(props) {
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

        const abort = () => {
            const url = new URL(`${props.codeRequest.redirect_uri}`);
            url.searchParams.set('error', 'access_denied');
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
            } catch {
                autoConsentFailed.value = true;
            }
        };

        // Auto-consent for built-in clients (e.g. the per-realm `web` client).
        // `built_in` is a provisioning-only trust boundary — the client
        // validator strips it on create/update, so no API caller can self-
        // assign it. Skipping the scope-consent step is therefore safe; user/
        // admin-created clients are never built_in and still show consent.
        const autoConsent = computed<boolean>(() => !!props.client.built_in);

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
            autoConsent,
            showSpinner,
            translationsDefault,
            translationsClient,
        };
    },
});
</script>
<template>
    <div
        v-if="showSpinner"
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
