/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SlotName, buildItemActionToggle } from '@vue-layout/list-controls';
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
import type { Client, Realm } from '@authup/core';
import { DomainType, createNanoID } from '@authup/core';
import {
    buildFormInput,
    buildFormInputCheckbox,
    buildFormSubmit,
    buildFormTextarea,
} from '@vue-layout/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    alphaWithUpperNumHyphenUnderScore,
    createEntityManager,
    initFormAttributesFromSource,
} from '../../core';
import { useTranslator, useValidationTranslator } from '../../translator';
import { RealmList } from '../realm';
import { ClientRedirectUriList } from './ClientRedirectUriList';

export const ClientForm = defineComponent({
    name: 'ClientForm',
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Client>,
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
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            description: '',
            realm_id: '',
            redirect_uri: '',
            base_url: '',
            root_url: '',
            is_confidential: false,
            secret: '',
        });

        const $v = useVuelidate({
            name: {
                required,
                alphaWithUpperNumHyphenUnderScore,
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            description: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            realm_id: {
                required,
            },
            redirect_uri: {
                url,
                maxLength: maxLength(2000),
            },
            is_confidential: {

            },
            secret: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
        }, form);

        const manager = createEntityManager(`${DomainType.CLIENT}`, {
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.entity);
        const updatedAt = useUpdatedAt(props.entity);

        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const isRealmLocked = computed(() => !!props.realmId);

        const generateSecret = () => {
            form.secret = createNanoID('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!.', 64);
        };

        function initForm() {
            if (props.name) {
                form.name = props.name;
            }

            if (props.realmId) {
                form.realm_id = props.realmId;
            }

            initFormAttributesFromSource(form, manager.entity.value);

            if (form.secret.length === 0) {
                generateSecret();
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                manager.entity.value = props.entity;

                initForm();
            }
        });

        initForm();

        const submit = async () => {
            if ($v.value.$invalid) {
                return;
            }

            await manager.createOrUpdate(form);
        };

        const render = () => {
            const name = [
                buildFormInput({
                    validationResult: $v.value.name,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'Name',
                    value: form.name,
                    onChange(input) {
                        form.name = input;
                    },
                    props: {
                        disabled: isNameFixed.value,
                    },
                }),
                h('small', 'Something users will recognize and trust.'),
            ];

            const description = [
                buildFormTextarea({
                    validationResult: $v.value.description,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'Description',
                    value: form.description,
                    onChange(input) {
                        form.description = input;
                    },
                    props: {
                        rows: 7,
                    },
                }),
                h('small', 'This is displayed to all users of this application.'),
            ];

            const redirectUri = [
                h('label', { class: 'form-label' }, [
                    'Redirect Uri(s)',
                ]),
                h(ClientRedirectUriList, {
                    uri: form.redirect_uri,
                    onUpdated(value: string) {
                        form.redirect_uri = value;
                    },
                }),
                h('small', 'URI pattern a browser can redirect to after a successful login.'),
            ];

            const isConfidential = buildFormInputCheckbox({
                validationResult: $v.value.is_confidential,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Is Confidential?',
                value: form.is_confidential,
                onChange(input) {
                    form.is_confidential = input;
                },
            });

            let id : VNodeArrayChildren = [];

            if (manager.entity.value) {
                id = [
                    buildFormInput({
                        labelContent: 'ID',
                        value: manager.entity.value.id,
                        props: {
                            disabled: true,
                        },
                    }),
                ];
            }

            const secret = [
                buildFormInput({
                    validationResult: $v.value.secret,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: [
                        'Secret',
                    ],
                    value: form.secret,
                    onChange(input) {
                        form.secret = input;
                    },
                }),
                h('div', { class: 'mb-2' }, [
                    h('button', {
                        class: 'btn btn-dark btn-xs',
                        onClick($event: any) {
                            $event.preventDefault();

                            generateSecret.call(null);
                        },
                    }, [
                        h('i', { class: 'fa fa-wrench' }),
                        ' ',
                        useTranslator().getSync('form.generate.button', props.translatorLocale),
                    ]),
                ]),
            ];

            const submitForm = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button', props.translatorLocale),
                createText: useTranslator().getSync('form.create.button', props.translatorLocale),
                busy,
                submit,
                isEditing: isEditing.value,
                validationResult: $v.value,
            });

            let realm : VNodeArrayChildren = [];

            if (!isRealmLocked.value) {
                realm = [
                    h('hr'),
                    h('label', { class: 'form-label' }, 'Realm'),
                    h(RealmList, {
                        headerTitle: false,
                    }, {
                        [SlotName.ITEM_ACTIONS]: (
                            props: { data: Realm, busy: boolean },
                        ) => buildItemActionToggle({
                            currentValue: form.realm_id,
                            value: props.data.id,
                            busy: props.busy,
                            onChange(value) {
                                form.realm_id = value as string;
                            },
                        }),
                    }),
                ];
            }

            const leftColumn = h('div', { class: 'col' }, [
                id,
                h('hr'),
                name,
                h('hr'),
                secret,
                realm,
            ]);

            const rightColumn = [
                h('div', {
                    class: 'col',
                }, [
                    description,
                    h('hr'),
                    redirectUri,
                    h('hr'),
                    isConfidential,
                    submitForm,
                ]),
            ];

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.apply(null);
                },
            }, [
                h('div', { class: 'row' }, [
                    leftColumn,
                    rightColumn,
                ]),
            ]);
        };

        return () => render();
    },
});

export default ClientForm;
