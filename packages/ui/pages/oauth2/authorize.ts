/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/common';
import { Ref } from 'vue';
import { useToast } from 'vue-toastification';
import { defineNuxtComponent, navigateTo } from '#app';
import { useAPI } from '../../composables/api';
import { LayoutKey, LayoutNavigationID } from '../../config/layout';
import { useAuthStore } from '../../store/auth';

export default defineNuxtComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
            layout: 'oauth2',
        });

        const route = useRoute();

        const authStore = useAuthStore();
        if (!authStore.loggedIn) {
            navigateTo({
                path: '/login',
                query: {
                    ...route.query,
                    redirect: route.path,
                },
            });

            return;
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const entity : Ref<Client> = ref(null);

        try {
            entity.value = await useAPI()
                .client
                .getOne(route.query.client_id as string);
        } catch (e) {
            navigateTo({ path: '/admin/roles' });

            return;
        }

        // todo: verify redirect_uri -> error=redirect_uri_mismatch
        // error_description=The redirect_uri must match the registered callback URL for this application

        const abort = () => {
            const url = new URL(entity.value.redirect_uri as string);
            url.searchParams.set('error', 'access_denied');
            url.searchParams.set(
                'error_description',
                'The resource owner or authorization server denied the request',
            );

            if (route.query.state) {
                url.searchParams.set('state', route.query.state as string);
            }

            window.location.href = url.href;
        };

        const authorize = async () => {
            try {
                const response = await useAPI()
                    .post('authorize', {
                        response_type: 'code', // todo: get from route
                        client_id: entity.value.id,
                        redirect_uri: entity.value.redirect_uri as string,
                        ...(route.query.state ? { state: route.query.state } : {}),
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
            const header = h('div', { class: 'flex-column d-flex' }, [
                h('div', { class: 'text-center text-secondary' }, [
                    h('div', 'An external application'),
                    h('div', { class: 'fs-5 fw-bold' }, entity.value.name),
                    h('div', 'wants to access your account'),
                ]),
            ]);

            const scopes = h('div', { class: 'mt-2 mb-2' }, [
                h('div', [
                    'This will allow the',
                    h('strong', { class: 'ps-1 pe-1' }, entity.value.name),
                    'developer to:',
                ]),
                h('div', { class: 'flex-column' }, [
                    h('div', { class: 'd-flex flex-row' }, [
                        h('div', { style: { width: '15px' }, class: 'text-center' }, [
                            h('i', { class: 'fa-solid fa-check text-success' }),
                        ]),
                        h('div', { class: 'ms-1' }, [
                            h('small', [
                                '...',
                            ]),
                        ]),
                    ]),
                    h('div', { class: 'd-flex flex-row' }, [
                        h('div', { style: { width: '15px' }, class: 'text-center' }, [
                            h('i', { class: 'fa-solid fa-times text-danger' }),
                        ]),
                        h('div', { class: 'ms-1' }, [
                            h('small', [
                                '...',
                            ]),
                        ]),
                    ]),
                ]),
            ]);

            const details = h('div', { class: 'mt-auto' }, [
                h('div', { class: 'd-flex flex-row' }, [
                    h('div', [
                        h('i', { class: 'fa-solid fa-link' }),
                    ]),
                    h('div', { class: 'ms-1' }, [
                        h('small', [
                            'Once authorized, you will be redirected to:',
                            ' ',
                            entity.value.redirect_uri,
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

            const footer = h('div', { class: 'd-flex justify-content-evenly mt-auto' }, [
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
                    header,
                    scopes,
                    details,
                    footer,
                ]),
            ]);
        };

        return () => render();
    },
});
