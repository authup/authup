<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Client, OAuth2AuthorizationCodeRequest, Scope } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { injectHTTPClient } from '../../../core';
import AuthorizeScopes from './AuthorizeScopes.vue';

export default defineComponent({
    components: { AuthorizeScopes },
    props: {
        client: {
            type: Object as PropType<Client>,
            required: true,
        },
        scopes: {
            type: Array as PropType<Scope[]>,
        },
        codeRequest: {
            type: Object as PropType<OAuth2AuthorizationCodeRequest>,
            required: true,
        },
    },
    setup(props) {
        const httpClient = injectHTTPClient();

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
            } catch (e) {
                // todo: show toast :)

            }
        };

        return {
            authorize,
            abort,
        };
    },
});
</script>
<template>
    <div class="flex-column d-flex gap-2">
        <div class="text-center">
            <h5 class="text-secondary mb-1">
                Application
            </h5>
            <h1 class="fw-bold">
                {{ client.name }}
            </h1>
        </div>

        <AuthorizeScopes
            :client="client"
            :scopes-requested="codeRequest.scope"
            :scopes-available="scopes"
        />

        <div class="mt-auto">
            <div class="d-flex flex-row">
                <div>
                    <i class="fa-solid fa-link" />
                </div>
                <div class="ms-1">
                    <small>
                        Once authorized, you will be redirected to: <strong>{{ codeRequest.redirect_uri }}</strong>
                    </small>
                </div>
            </div>
            <div class="d-flex flex-row">
                <div>
                    <i class="fa fa-solid fa-lock" />
                </div>
                <div class="ms-1">
                    <small>
                        This application is governed by the
                        <strong>
                            {{ client.name }}
                        </strong>
                        application's Privacy Policy and Terms of Service.
                    </small>
                </div>
            </div>
            <div class="d-flex flex-row">
                <div>
                    <i class="fa fa-solid fa-clock" />
                </div>
                <div class="ms-1">
                    <small>
                        Active since {{ client.created_at }}
                    </small>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-6">
                <button
                    type="button"
                    class="btn btn-block btn-secondary"
                    @click.prevent="abort"
                >
                    Abort
                </button>
            </div>
            <div class="col-6">
                <button
                    type="button"
                    class="btn btn-block btn-primary"
                    @click.prevent="authorize"
                >
                    Authorize
                </button>
            </div>
        </div>
    </div>
</template>
