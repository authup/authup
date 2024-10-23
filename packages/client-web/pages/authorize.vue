<script lang="ts">
import { injectHTTPClient, useStore } from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import type { Client, ClientScope } from '@authup/core-kit';
import { ref } from 'vue';
import type { Ref } from 'vue';
import { definePageMeta, useToast } from '#imports';
import { isGlobMatch } from '../utils';
import {
    createError, defineNuxtComponent, navigateTo, useRoute,
} from '#app';
import { extractOAuth2QueryParameters } from '../domains';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            layout: 'oauth2',
        });

        const toast = useToast();

        const route = useRoute();

        const store = useStore();
        const { loggedIn } = storeToRefs(store);
        if (!loggedIn.value) {
            await navigateTo({
                path: '/login',
                query: {
                    ...route.query,
                    redirect: route.path,
                },
            });

            throw createError({});
        }

        const parameters = extractOAuth2QueryParameters(route.query);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const entity : Ref<Client> = ref(null);

        try {
            entity.value = await useAPI()
                .client
                .getOne(parameters.client_id as string);
        } catch (e: any) {
            await navigateTo({
                path: '/authorize-error',
                query: {
                    message: 'The client_id is invalid.',
                },
            });

            throw createError({ });
        }

        const redirectUriPatterns = (entity.value.redirect_uri || '')
            .split(',');

        if (!isGlobMatch(parameters.redirect_uri, redirectUriPatterns)) {
            await navigateTo({
                path: '/authorize-error',
                query: {
                    message: 'The redirect_uri does not match.',
                },
            });

            throw createError({ });
        }

        let scopeNames : string[] = [];
        if (
            typeof parameters.scope === 'string' &&
            parameters.scope.length > 0
        ) {
            scopeNames = parameters.scope.split(' ');
        }

        const clientScopeQuery : BuildInput<ClientScope> = {
            filter: {
                client_id: entity.value.id,
                ...(scopeNames.length > 0 ? { scope: { name: scopeNames } } : {}),
            },
            relations: ['scope'],
        };

        const { data: clientScopes } = await injectHTTPClient().clientScope.getMany(clientScopeQuery);

        const abort = () => {
            const url = new URL(`${parameters.redirect_uri}`);
            url.searchParams.set('error', 'access_denied');
            url.searchParams.set(
                'error_description',
                'The resource owner or authorization server denied the request',
            );

            if (
                route.query.state &&
                typeof route.query.state === 'string'
            ) {
                url.searchParams.set('state', route.query.state);
            }

            window.location.href = url.href;
        };

        const authorize = async () => {
            try {
                const response = await injectHTTPClient()
                    .post('authorize', {
                        response_type: parameters.response_type,
                        client_id: entity.value.id,
                        redirect_uri: parameters.redirect_uri,
                        ...(route.query.state ? { state: route.query.state } : {}),
                        scope: clientScopes.map((item) => item.scope.name).join(' '),
                    });

                const { url } = response.data;

                window.location.href = url;
            } catch (e) {
                if (e instanceof Error && toast) {
                    toast.show({ variant: 'warning', body: e.message });
                }
            }
        };

        return {
            abort,
            authorize,
            clientScopes,
            entity,
            parameters,
        };
    },
});
</script>
<template>
    <div class="d-flex align-items-center justify-content-center h-100">
        <div class="oauth2-wrapper panel-card p-3 flex-column">
            <div class="flex-column d-flex">
                <div class="text-center text-secondary">
                    <div>An external application</div>
                    <div class="fs-5 fw-bold">
                        {{ entity.name }}
                    </div>
                </div>

                <div class="mt-2 mb-2">
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
                            <small>Once authorized, you will be redirected to: {{ parameters.redirect_uri }}</small>
                        </div>
                    </div>
                    <div class="d-flex flex-row">
                        <div>
                            <i class="fa fa-solid fa-lock" />
                        </div>
                        <div class="ms-1">
                            <small>
                                This application is governed by the
                                <strong class="ps-1 pe-1">
                                    {{ entity.name }}
                                </strong>
                                developer's Privacy Policy and Terms of Service.
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
        </div>
    </div>
</template>
