<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Client, ClientScope, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { deserializeOAuth2Scope } from '@authup/specs';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { injectHTTPClient } from '../../../core';

export default defineComponent({
    props: {
        client: {
            type: Object as PropType<Client>,
            required: true,
        },
        clientScopes: {
            type: Array as PropType<ClientScope[]>,
            default: () => [],
        },
        codeRequest: {
            type: Object as PropType<OAuth2AuthorizationCodeRequest>,
            required: true,
        },
    },
    setup(props) {
        const httpClient = injectHTTPClient();

        const requestedScopes = computed(() => {
            if (!props.codeRequest.scope) {
                return [];
            }

            return deserializeOAuth2Scope(props.codeRequest.scope);
        });

        const scopes = computed(() => {
            const output : {
                name: string,
                description?: string | null,
                enabled: boolean
            }[] = [];

            let index = -1;
            for (let i = 0; i < props.clientScopes.length; i++) {
                index = requestedScopes.value.indexOf(props.clientScopes[i].scope.name);

                output.push({
                    name: props.clientScopes[i].scope.name,
                    description: props.clientScopes[i].scope.description,
                    enabled: index !== -1,
                });
            }

            return output;
        });

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
                        scope: props.clientScopes.map((item) => item.scope.name).join(' '),
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

            scopes,
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

        <div v-if="clientScopes && clientScopes.length > 0">
            <div>
                This will allow the <strong>{{ client.name }}</strong> application to
            </div>
            <div class="flex-column">
                <div
                    v-for="item in scopes"
                    :key="item.name"
                    class="d-flex flex-row gap-1"
                >
                    <div class="text-center">
                        <i
                            class="fa-solid"
                            :class="{
                                'fa-check text-success': item.enabled,
                                'fa-times text-danger': !item.enabled
                            }"
                        />
                    </div>
                    <div>
                        <strong>{{ item.name }}</strong>

                        <template v-if="item.description">
                            <p>{{ item.description }}</p>
                        </template>
                    </div>
                </div>
            </div>
        </div>

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
