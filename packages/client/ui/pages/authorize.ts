/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import type { Client, ClientScope } from '@authup/common';
import { isGlobMatch } from '@authup/common';
import type { Ref, VNodeArrayChildren } from 'vue';
import { useToast } from 'vue-toastification';
import { defineNuxtComponent, navigateTo } from '#app';
import { useAPI } from '../composables/api';
import { LayoutKey, LayoutNavigationID } from '../config/layout';
import { extractOAuth2QueryParameters } from '../domains';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
            layout: 'oauth2',
        });

        const route = useRoute();

        const store = useAuthStore();
        const { loggedIn } = storeToRefs(store);
        if (!loggedIn.value) {
            return navigateTo({
                path: '/login',
                query: {
                    ...route.query,
                    redirect: route.path,
                },
            });
        }

        const renderError = (message: string | VNodeArrayChildren) => h('div', { class: 'd-flex align-items-center justify-content-center h-100' }, [
            h('div', { class: 'oauth2-wrapper panel-card p-3 flex-column' }, [
                h('div', { class: 'text-center' }, [
                    h('i', { class: 'fa-solid fa-exclamation fa-10x text-danger' }),
                ]),
                h('div', { class: 'text-center fs-6 p-3' }, [
                    message,
                ]),
            ]),
        ]);

        const parameters = extractOAuth2QueryParameters(route.query);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const entity : Ref<Client> = ref(null);

        try {
            entity.value = await useAPI()
                .client
                .getOne(parameters.client_id as string);
        } catch (e: any) {
            return () => renderError([
                'The',
                h('strong', { class: 'ps-1 pe-1' }, 'client_id'),
                'is invalid',
            ]);
        }

        const redirectUriPatterns = (entity.value.redirect_uri || '')
            .split(',');

        if (!isGlobMatch(parameters.redirect_uri, redirectUriPatterns)) {
            return () => renderError([
                'The',
                h('strong', { class: 'ps-1 pe-1' }, 'redirect_uri'),
                'does not match.',
            ]);
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
            },
            relations: ['scope'],
        };

        if (
            clientScopeQuery.filter &&
            scopeNames.length > 0
        ) {
            clientScopeQuery.filter.scope = {
                name: scopeNames,
            };
        }

        const { data: clientScopes } = await useAPI().clientScope.getMany(clientScopeQuery);

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
                const response = await useAPI()
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
                if (e instanceof Error) {
                    const toast = useToast();
                    toast.warning(e.message);
                }
            }
        };

        const render = () => {
            const headerView = h('div', { class: 'flex-column d-flex' }, [
                h('div', { class: 'text-center text-secondary' }, [
                    h('div', 'An external application'),
                    h('div', { class: 'fs-5 fw-bold' }, entity.value.name),
                    h('div', 'wants to access your account'),
                ]),
            ]);

            const scopeFilter : Record<string, any> = {
                client_id: entity.value.id,
            };

            if (scopeNames.length > 0) {
                scopeFilter['scope.name'] = scopeNames;
            } else {
                scopeFilter.default = true;
            }

            const scopeItems = clientScopes.map((clientScope) => h('div', { class: 'd-flex flex-row' }, [
                h('div', { style: { width: '15px' }, class: 'text-center' }, [
                    h('i', { class: 'fa-solid fa-check text-success' }),
                ]),
                h('div', { class: 'ms-1' }, [
                    h('small', [
                        clientScope.scope.name,
                    ]),
                ]),
            ]));

            const scopeView = h('div', { class: 'mt-2 mb-2' }, [
                h('div', [
                    'This will allow the',
                    h('strong', { class: 'ps-1 pe-1' }, entity.value.name),
                    'developer to:',
                ]),
                h('div', { class: 'flex-column' }, [
                    scopeItems,
                ]),
            ]);

            const detailsView = h('div', { class: 'mt-auto' }, [
                h('div', { class: 'd-flex flex-row' }, [
                    h('div', [
                        h('i', { class: 'fa-solid fa-link' }),
                    ]),
                    h('div', { class: 'ms-1' }, [
                        h('small', [
                            'Once authorized, you will be redirected to:',
                            ' ',
                            parameters.redirect_uri,
                        ]),
                    ]),
                ]),
                h('div', { class: 'd-flex flex-row' }, [
                    h('div', [
                        h('i', { class: 'fa-solid fa-lock' }),
                    ]),
                    h('div', { class: 'ms-1' }, [
                        h('small', [
                            'This application is governed by the',
                            h('strong', { class: 'ps-1 pe-1' }, entity.value.name),
                            'developer\'s Privacy Policy and Terms of Service.',
                        ]),
                    ]),
                ]),
                h('div', { class: 'd-flex flex-row' }, [
                    h('div', [
                        h('i', { class: 'fa-solid fa-clock' }),
                    ]),
                    h('div', { class: 'ms-1' }, [
                        h('small', [
                            'Active since',
                            ' ',
                            `${entity.value.created_at}`,
                        ]),
                    ]),
                ]),
            ]);

            const footerView = h('div', { class: 'd-flex justify-content-evenly mt-auto' }, [
                h('div', [
                    h('button', {
                        type: 'button',
                        class: 'btn btn-sm btn-secondary',
                        onClick: ($event: any) => {
                            $event.preventDefault();

                            return abort();
                        },
                    }, [
                        'Abort',
                    ]),
                ]),
                h('div', [
                    h('button', {
                        type: 'button',
                        class: 'btn btn-sm btn-primary',
                        onClick: ($event: any) => {
                            $event.preventDefault();

                            return authorize();
                        },
                    }, [
                        'Authorize',
                    ]),
                ]),
            ]);

            return h('div', { class: 'd-flex align-items-center justify-content-center h-100' }, [
                h('div', { class: 'oauth2-wrapper panel-card p-3 flex-column' }, [
                    headerView,
                    scopeView,
                    detailsView,
                    footerView,
                ]),
            ]);
        };

        return () => render();
    },
});
