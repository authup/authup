/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import type {
    PropType,
    VNodeArrayChildren, VNodeChild,
} from 'vue';
import {
    computed,
    defineComponent,
    h,
    reactive,
    ref,
    toRef,
} from 'vue';
import {
    maxLength, minLength, required, url,
} from '@vuelidate/validators';
import type { IdentityProvider, OAuth2OpenIDProviderMetadata } from '@authup/core';
import {
    DomainType, IdentityProviderProtocol,
} from '@authup/core';
import {
    buildFormInput,
    buildFormSubmit,
} from '@vue-layout/form-controls';
import { onChange, useIsEditing } from '../../composables';
import {
    createEntityManager, extendObjectProperties,
    initFormAttributesFromSource,
    useAPIClient,
} from '../../core';
import { useTranslator, useValidationTranslator } from '../../translator';
import { IdentityProviderBasicForm } from './IdentityProviderBasicForm';
import { IdentityProviderDiscovery } from './IdentityProviderDiscovery';

export const IdentityProviderOAuth2Form = defineComponent({
    name: 'IdentityProviderOAuth2Form',
    props: {
        entity: {
            type: Object as PropType<IdentityProvider>,
            required: false,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
        translatorLocale: {
            type: String,
            default: undefined,
        },
        apiUrl: {
            type: String,
            default: 'http://localhost:3001',
        },
        protocol: {
            type: String as PropType<string | null>,
            default: IdentityProviderProtocol.OAUTH2,
        },
        preset: {
            type: String as PropType<string | null>,
        },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const protocol = toRef(props, 'protocol');
        const preset = toRef(props, 'preset');

        const busy = ref(false);
        const form = reactive({
            realm_id: '',

            name: '',
            slug: '',
            enabled: true,

            token_url: '',
            authorize_url: '',
            scope: '',
            client_id: '',
            client_secret: '',
        });

        const formBasicValid = ref(false);

        const $v = useVuelidate({
            realm_id: {
                required,
            },
            token_url: {
                required,
                url,
                minLength: minLength(5),
                maxLength: maxLength(2000),
            },
            authorize_url: {
                required,
                url,
                minLength: minLength(5),
                maxLength: maxLength(2000),
            },
            scope: {
                minLength: minLength(3),
                maxLength: maxLength(512),
            },
            client_id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            client_secret: {
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
        }, form);

        const manager = createEntityManager(`${DomainType.IDENTITY_PROVIDER}`, {
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.entity);

        const authorizeUri = computed<string>(() => {
            if (!manager.entity.value) {
                return '';
            }

            return useAPIClient().identityProvider.getAuthorizeUri(props.apiUrl, manager.entity.value.id);
        });

        onChange(preset, () => {
            if (preset.value) {
                form.name = preset.value;
                form.slug = preset.value;

                return;
            }

            form.name = '';
            form.slug = '';
        });
        function initForm() {
            if (!manager.entity.value) {
                if (props.realmId) {
                    form.realm_id = props.realmId;
                }

                if (preset.value) {
                    form.name = preset.value;
                    form.slug = preset.value;
                }
            }

            initFormAttributesFromSource(form, manager.entity.value);
        }

        initForm();

        const submit = async () => {
            if ($v.value.$invalid || !formBasicValid.value) {
                return;
            }

            // todo add preset

            await manager.createOrUpdate({
                ...form,
                protocol: (protocol.value || IdentityProviderProtocol.OAUTH2) as IdentityProviderProtocol,
            });
        };

        const render = () => {
            let details : VNodeArrayChildren = [];
            if (isEditing.value) {
                details = [
                    h('h6', [
                        h('i', { class: 'fas fa-info-circle' }),
                        ' ',
                        'Details',
                    ]),
                    buildFormInput({
                        labelContent: 'Authorize URL',
                        value: authorizeUri,
                        props: {
                            disabled: true,
                        },
                    }),
                    h('hr'),
                ];
            }

            const firstRow = h('div', {
                class: 'row',
            }, [
                h('div', {
                    class: 'col',
                }, [
                    h('h6', [
                        h('i', { class: 'fa fa-wrench' }),
                        ' ',
                        'Basic',
                    ]),
                    h(IdentityProviderBasicForm, {
                        slug: form.slug,
                        name: form.name,
                        enabled: form.enabled,
                        onUpdated({ data, valid }) {
                            formBasicValid.value = valid;

                            extendObjectProperties(form, data);
                        },
                    }),
                ]),
                h('div', {
                    class: 'col',
                }, [
                    h('h6', [
                        h('i', { class: 'fa fa-lock' }),
                        ' ',
                        'Security',
                    ]),
                    buildFormInput({
                        validationResult: $v.value.client_id,
                        validationTranslator: useValidationTranslator(props.translatorLocale),
                        labelContent: 'Client ID',
                        value: form.client_id,
                        onChange(input) {
                            form.client_id = input;
                        },
                    }),
                    buildFormInput({
                        validationResult: $v.value.client_secret,
                        validationTranslator: useValidationTranslator(props.translatorLocale),
                        labelContent: 'Client Secret',
                        value: form.client_secret,
                        onChange(input) {
                            form.client_secret = input;
                        },
                    }),
                ]),
            ]);

            let endpointsNode : VNodeChild;
            if (!preset.value) {
                let discoveryNode : VNodeChild;

                if (protocol.value === IdentityProviderProtocol.OIDC) {
                    discoveryNode = [
                        h('h6', [
                            h('i', { class: 'fas fa-binoculars pe-1' }),
                            'Discovery',
                        ]),
                        h(IdentityProviderDiscovery, {
                            onLookup(data: OAuth2OpenIDProviderMetadata) {
                                form.authorize_url = data.authorization_endpoint;
                                form.token_url = data.token_endpoint;
                            },
                        }),
                    ];
                }

                endpointsNode = [
                    discoveryNode,
                    h(
                        'div',
                        {
                            class: 'row',
                        },
                        [
                            h('div', {
                                class: 'col',
                            }, [
                                h('h6', [
                                    h('i', { class: 'fa-solid fa-key' }),
                                    ' ',
                                    'Token',
                                ]),

                                buildFormInput({
                                    validationResult: $v.value.token_url,
                                    validationTranslator: useValidationTranslator(props.translatorLocale),
                                    labelContent: 'Endpoint',
                                    value: form.token_url,
                                    onChange(input) {
                                        form.token_url = input;
                                    },
                                    props: {
                                        placeholder: 'https://...',
                                    },
                                }),
                            ]),
                            h('div', {
                                class: 'col',
                            }, [
                                h('h6', [
                                    h('i', { class: 'fa-solid fa-vihara' }),
                                    ' ',
                                    'Authorization',
                                ]),
                                buildFormInput({
                                    validationResult: $v.value.authorize_url,
                                    validationTranslator: useValidationTranslator(props.translatorLocale),
                                    labelContent: 'Endpoint',
                                    value: form.authorize_url,
                                    onChange(input) {
                                        form.authorize_url = input;
                                    },
                                    props: {
                                        placeholder: 'https://...',
                                    },
                                }),
                            ]),
                        ],
                    ),
                    h('hr'),
                ];
            }

            const submitButton = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button', props.translatorLocale),
                createText: useTranslator().getSync('form.create.button', props.translatorLocale),
                submit,
                busy,
                isEditing: isEditing.value,
                validationResult: $v.value,
            });

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.call(null);
                },
            }, [
                details,
                firstRow,
                h('hr'),
                endpointsNode,
                submitButton,
            ]);
        };

        return () => render();
    },
});

export default IdentityProviderOAuth2Form;
