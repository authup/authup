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
import { defineComponent } from 'vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationClientKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
    injectHTTPClient,
    useTranslations,
    useTranslationsForNamespace,
} from '../../../core';
import AuthorizeScopes from './AuthorizeScopes.vue';

export default defineComponent({
    components: { AuthorizeScopes },
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
                { key: TranslatorTranslationClientKey.ONCE_AUTHORIZED_REDIRECT },
                { key: TranslatorTranslationClientKey.ACTIVE_SINCE },
                {
                    key: TranslatorTranslationClientKey.GOVERNED_BY,
                    data: { client: props.client.name },
                },
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

        const authorize = async () => {
            try {
                const response = await httpClient
                    .authorize
                    .confirm({
                        response_type: props.codeRequest.response_type,
                        client_id: props.client.id,
                        redirect_uri: props.codeRequest.redirect_uri,
                        ...(props.codeRequest.state ? { state: props.codeRequest.state } : {}),
                        ...(props.codeRequest.scope ? { scope: props.codeRequest.scope } : {}),
                    });

                const { url } = response;

                if (typeof window !== 'undefined') {
                    window.location.href = url;
                }
            } catch {
                // todo: show toast :)

            }
        };

        return {
            authorize,
            abort,
            translationsDefault,
            translationsClient,
        };
    },
});
</script>
<template>
    <div class="flex-col flex gap-2">
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
                        {{ translationsClient.onceAuthorizedRedirect }} <strong>{{ codeRequest.redirect_uri }}</strong>
                    </small>
                </div>
            </div>
            <div class="flex flex-row">
                <div>
                    <VCIcon name="fa6-solid:lock" />
                </div>
                <div class="ms-1">
                    <small>
                        {{ translationsClient.governedBy }}
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

        <div class="row">
            <div class="col-6">
                <button
                    type="button"
                    class="btn w-full btn-secondary"
                    @click.prevent="abort"
                >
                    {{ translationsDefault.abort }}
                </button>
            </div>
            <div class="col-6">
                <button
                    type="button"
                    class="btn w-full btn-primary"
                    @click.prevent="authorize"
                >
                    {{ translationsDefault.authorize }}
                </button>
            </div>
        </div>
    </div>
</template>
