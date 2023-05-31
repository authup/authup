/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import type {
    PropType,
    VNodeArrayChildren,
} from 'vue';
import {
    computed,
    defineComponent,
    h,
    reactive,
    ref,
    watch,
} from 'vue';
import {
    maxLength, minLength, required, url,
} from '@vuelidate/validators';
import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core';
import { IdentityProviderProtocol, createNanoID } from '@authup/core';
import {
    buildFormInput,
    buildFormInputCheckbox,
    buildFormSubmit,
} from '@vue-layout/form-controls';
import {
    createSubmitHandler,
    initFormAttributesFromSource,
} from '../../helpers';
import {
    alphaNumHyphenUnderscore, useAPIClient,
} from '../../core';
import { IdentityProviderRoleAssignmentList } from '../identity-provider-role';
import { useTranslator, useValidationTranslator } from '../../translator';

export const OAuth2ProviderForm = defineComponent({
    name: 'OAuth2ProviderForm',
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
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            slug: '',
            protocol: IdentityProviderProtocol.OAUTH2,
            enabled: true,
            realm_id: '',

            token_url: '',
            authorize_url: '',
            scope: '',
            client_id: '',
            client_secret: '',
        });

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(128),
            },
            slug: {
                required,
                alphaNumHyphenUnderscore,
                minLength: minLength(3),
                maxLength: maxLength(36),
            },
            enabled: {
                required,
            },
            realm_id: {
                required,
            },
            protocol: {

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

        const authorizeUri = computed<string>(() => {
            if (!props.entity) {
                return '';
            }

            return useAPIClient().identityProvider.getAuthorizeUri(props.apiUrl, props.entity.id);
        });
        const isEditing = computed<boolean>(() => typeof props.entity !== 'undefined' && !!props.entity.id);
        const isSlugEmpty = computed(() => !form.slug || form.slug.length === 0);
        const isNameEmpty = computed(() => !form.name || form.name.length === 0);
        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

        function generateId() {
            const isSame: boolean = form.slug === form.name ||
                (isSlugEmpty.value && isNameEmpty.value);

            form.slug = createNanoID();
            if (isSame) {
                form.name = form.slug;
            }
        }

        function initForm() {
            if (props.realmId) form.realm_id = props.realmId;
            initFormAttributesFromSource(form, props.entity);
            if (isSlugEmpty.value) {
                generateId();
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                initForm();
            }
        });

        initForm();

        const submit = createSubmitHandler<IdentityProvider>({
            props,
            ctx,
            form,
            formIsValid: () => !$v.value.$invalid,
            create: async (data) => useAPIClient().identityProvider.create(data),
            update: async (id, data) => useAPIClient().identityProvider.update(id, data),
        });

        const render = () => {
            const enabled = buildFormInputCheckbox({
                groupClass: 'form-switch mt-3',
                labelContent: 'Enabled?',
                value: form.enabled,
                onChange(input) {
                    form.enabled = input;
                },
            });

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
                        'Configuration',
                    ]),
                    buildFormInput({
                        validationResult: $v.value.slug,
                        validationTranslator: useValidationTranslator(props.translatorLocale),
                        labelContent: 'Slug',
                        value: form.slug,
                        onChange(input) {
                            form.slug = input;
                        },
                    }),
                    h('div', {
                        class: 'mb-3',
                    }, [
                        h('button', {
                            class: 'btn btn-xs btn-dark',
                            onClick($event: any) {
                                $event.preventDefault();

                                generateId.call(null);
                            },
                        }, [
                            h('i', { class: 'fa fa-wrench' }),
                            ' ',
                            'Generate',
                        ]),
                    ]),
                    buildFormInput({
                        validationResult: $v.value.name,
                        validationTranslator: useValidationTranslator(props.translatorLocale),
                        labelContent: 'Name',
                        value: form.name,
                        onChange(input) {
                            form.name = input;
                        },
                    }),
                    enabled,
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

            const thirdRow = h(
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
            );

            let roleList : VNodeArrayChildren = [];

            if (props.entity) {
                roleList = [h('div', [
                    h('h6', [
                        h('i', { class: 'fa fa-users' }),
                        ' ',
                        'Roles',
                    ]),
                    h(IdentityProviderRoleAssignmentList, {
                        entityId: props.entity.id,
                    }),
                    h('hr'),
                ])];
            }

            const submitButton = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button', props.translatorLocale),
                createText: useTranslator().getSync('form.create.button', props.translatorLocale),
                submit,
                busy,
                isEditing,
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
                thirdRow,
                h('hr'),
                roleList, // roleList will provide hr
                submitButton,
            ]);
        };

        return () => render();
    },
});

export default OAuth2ProviderForm;
