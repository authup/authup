/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { useAPIClient } from '@authup/client-vue';
import { REALM_MASTER_NAME } from '@authup/core';
import type { IdentityProvider, Realm } from '@authup/core';
import type { ListItemSlotProps, ListItemsSlotProps } from '@vue-layout/hyperscript';
import {
    PresetsBuildIn, SlotName, buildFormInput, buildFormSelect, buildFormSubmit,
} from '@vue-layout/hyperscript';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { VNodeArrayChildren } from 'vue';
import { useToast } from 'vue-toastification';
import { Link } from '#components';
import { defineNuxtComponent, navigateTo, useRoute } from '#app';
import { reactive, ref, resolveComponent } from '#imports';
import Login from '../components/svg/LoginSVG';
import { translateValidationMessage } from '../composables/ilingo';
import { LayoutKey, LayoutNavigationID } from '../config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
            [LayoutKey.NAVIGATION_ID]: LayoutNavigationID.DEFAULT,
        });

        const form = reactive({
            name: '',
            password: '',
            realm_id: '',
        });

        const realmList = resolveComponent('RealmList');
        const identityProviderList = resolveComponent('IdentityProviderList');

        const vuelidate = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(255),
            },
            password: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(255),
            },
            realm_id: {

            },
        }, form);

        const store = useAuthStore();

        const busy = ref(false);

        const identityProviderQuery = computed<BuildInput<IdentityProvider>>(() => {
            if (!form.realm_id) {
                return {};
            }

            return {
                filters: {
                    realm_id: form.realm_id,
                },
            };
        });
        const identityProviderRef = ref<null | { load:() => any, [key: string]: any}>(null);

        const submit = async () => {
            try {
                console.log(form);

                await store.login({
                    name: form.name,
                    password: form.password,
                    realmId: form.realm_id,
                });

                const route = useRoute();
                const { redirect, ...query } = route.query;

                navigateTo({
                    path: (redirect || '/') as string,
                    query,
                });
            } catch (e: any) {
                if (e instanceof Error) {
                    const toast = useToast();
                    toast.warning(e.message);
                }
            }
        };

        const app = useNuxtApp();

        Promise.resolve()
            .then(store.logout);

        const render = () => {
            const name = buildFormInput({
                validationResult: vuelidate.value.name,
                validationTranslator: translateValidationMessage,
                labelContent: 'Name',
                value: form.name,
                onChange(value) {
                    form.name = value;
                },
            });

            const password = buildFormInput({
                validationResult: vuelidate.value.password,
                validationTranslator: translateValidationMessage,
                labelContent: 'Password',
                value: form.password,
                onChange(value) {
                    form.password = value;
                },
                props: {
                    type: 'password',
                },
            });

            const submitButton = buildFormSubmit({
                validationResult: vuelidate.value,
                createText: 'Login',
                createButtonClass: {
                    value: 'btn btn-sm btn-dark btn-block',
                    presets: {
                        [PresetsBuildIn.BOOTSTRAP_V5]: false,
                    },
                },
                createIconClass: 'fa-solid fa-right-to-bracket',
                submit,
                busy,
            });

            const realmPicker = [
                h(realmList as string, { withHeader: true }, {
                    [SlotName.HEADER]: () => h('h6', [
                        'Realms',
                    ]),
                    [SlotName.ITEM_ACTIONS]: (props: ListItemSlotProps<Realm>) => {
                        const isMaster = props.data.name === REALM_MASTER_NAME;
                        const canCheck = !(isMaster && !form.realm_id) &&
                        form.realm_id !== props.data.id;

                        if (canCheck) {
                            return h('button', {
                                class: {
                                    'btn btn-xs btn-primary': canCheck,
                                    'btn btn-xs btn-danger': !canCheck,
                                },
                                onClick($event: any) {
                                    $event.preventDefault();

                                    form.realm_id = props.data.id;

                                    if (
                                        identityProviderRef.value &&
                                        typeof identityProviderRef.value.load === 'function'
                                    ) {
                                        identityProviderRef.value.load();
                                    }
                                },
                            }, [
                                h('i', {
                                    class: {
                                        'fa fa-check': canCheck,
                                        'fa fa-times': !canCheck,
                                    },
                                }),
                            ]);
                        }

                        return h('span', { class: 'badge bg-success' }, [
                            'active',
                        ]);
                    },
                }),
            ];

            const identityProviderPicker = [
                h(identityProviderList as string, {
                    withHeader: true,
                    withSearch: false,
                    query: identityProviderQuery,
                    ref: identityProviderRef,
                }, {
                    [SlotName.HEADER]: () => h('h6', [
                        'Identity Providers',
                    ]),
                    [SlotName.ITEMS]: (props: ListItemsSlotProps<IdentityProvider>) => {
                        const elements : VNodeArrayChildren = [];
                        const apiClient = useAPIClient();

                        for (let i = 0; i < props.data.length; i++) {
                            const element = [
                                h('div', [
                                    h('a', {
                                        href: apiClient.identityProvider.getAuthorizeUri(
                                            app.$config.public.apiUrl,
                                            props.data[i].id,
                                        ),
                                        class: 'btn btn-primary btn-xs',
                                    }, [
                                        props.data[i].name,
                                    ]),
                                ]),
                            ];

                            elements.push(element);
                        }

                        return h('div', {
                            class: 'd-flex flex-row',
                        }, elements);
                    },
                }),
            ];

            return h('div', { class: 'container' }, [
                h('h4', [
                    h('i', { class: 'fa-solid fa-arrow-right-to-bracket pe-2' }),
                    'Login',
                ]),
                h('div', {
                    class: 'text-center',
                }, [
                    h(Login, {
                        height: 320,
                    }),
                ]),
                h('form', {
                    onSubmit($event: any) {
                        $event.preventDefault();

                        return submit.call(null);
                    },
                }, [
                    h('div', { class: 'row' }, [
                        h('div', { class: 'col-8' }, [
                            name,
                            password,
                            submitButton,
                            h('hr'),
                            identityProviderPicker,
                        ]),
                        h('div', { class: 'col-4' }, [
                            realmPicker,
                        ]),
                    ]),

                ]),
            ]);
        };

        return () => render();
    },
});
