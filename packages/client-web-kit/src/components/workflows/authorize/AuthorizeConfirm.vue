<!--
  - Copyright (c) 2025.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import type { Client, ClientScope } from '@authup/core-kit';
import type { BuildInput } from 'rapiq';
import type { PropType, Ref } from 'vue';
import { defineComponent, ref } from 'vue';
import { injectHTTPClient } from '../../../core';
import type { OAuth2QueryParameters } from './helpers';

export default defineComponent({
    props: {
        entity: {
            type: Object as PropType<Client>,
            required: true,
        },
        params: {
            type: Object as PropType<OAuth2QueryParameters>,
            required: true,
        },
    },
    setup(props) {
        const httpClient = injectHTTPClient();

        let scopeNames : string[] = [];
        if (
            typeof props.params.scope === 'string' &&
            props.params.scope.length > 0
        ) {
            scopeNames = props.params.scope.split(' ');
        }

        const clientScopeQuery : BuildInput<ClientScope> = {
            filter: {
                client_id: props.entity.id,
                ...(scopeNames.length > 0 ? { scope: { name: scopeNames } } : {}),
            },
            relations: ['scope'],
        };

        const clientScopes : Ref<ClientScope[]> = ref([]);
        const loadClientScopes = async () => {
            const response = await httpClient.clientScope.getMany(clientScopeQuery);

            clientScopes.value = response.data;
        };

        Promise.resolve()
            .then(loadClientScopes);

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
                        client_id: props.entity.id,
                        redirect_uri: props.params.redirect_uri,
                        ...(props.params.state ? { state: props.params.state } : {}),
                        scope: clientScopes.value.map((item) => item.scope.name).join(' '),
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
            clientScopes,
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
                {{ entity.name }}
            </h1>
        </div>

        <div v-if="clientScopes && clientScopes.length > 0">
            <div>
                This will allow the
                <strong class="ps-1 pe-1">
                    {{ entity.name }}
                </strong>
                developer to:
            </div>
            <div class="flex-column">
                <div
                    v-for="item in clientScopes"
                    :key="item.id"
                    class="d-flex flex-row"
                >
                    <div
                        class="text-center"
                        style="width: 15px"
                    >
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
                            {{ entity.name }}
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
                        Active since {{ entity.created_at }}
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
