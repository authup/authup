<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Client, ClientScope, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
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
        params: {
            type: Object as PropType<OAuth2AuthorizationCodeRequest>,
            required: true,
        },
    },
    setup(props) {
        const httpClient = injectHTTPClient();

        const abort = () => {
            const url = new URL(`${props.params.redirect_uri}`);
            url.searchParams.set('error', 'access_denied');
            url.searchParams.set(
                'error_description',
                'The resource owner or authorization server denied the request',
            );

            if (props.params.state) {
                url.searchParams.set('state', props.params.state);
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
                        response_type: props.params.response_type,
                        client_id: props.client.id,
                        redirect_uri: props.params.redirect_uri,
                        ...(props.params.state ? { state: props.params.state } : {}),
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
                This will allow the
                <strong class="ps-1 pe-1">
                    {{ client.name }}
                </strong>
                developer to:
            </div>
            <div class="flex-column">
                <div
                    v-for="item in clientScopes"
                    :key="item.id"
                    class="d-flex flex-row"
                >
                    <div class="text-center ps-1 pe-1">
                        <i class="fa-solid fa-check text-success" />
                    </div>
                    <div class="ms-1">
                        <small>{{ item.scope.name }}</small>
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
                        Once authorized, you will be redirected to: <strong>{{ params.redirect_uri }}</strong>
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

        <div class="d-flex justify-content-evenly mt-auto">
            <div>
                <button
                    type="button"
                    class="btn btn-sm btn-secondary"
                    @click.prevent="abort"
                >
                    Abort
                </button>
            </div>
            <div>
                <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    @click.prevent="authorize"
                >
                    Authorize
                </button>
            </div>
        </div>
    </div>
</template>
