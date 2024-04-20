/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SlotName } from '@vuecs/list-controls';
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
    watch,
} from 'vue';
import {
    maxLength, minLength, required, url,
} from '@vuelidate/validators';
import type { Client, Realm } from '@authup/core-kit';
import { DomainType, createNanoID } from '@authup/core-kit';
import {
    buildFormGroup,
    buildFormInput,
    buildFormInputCheckbox,
    buildFormTextarea,
} from '@vuecs/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    alphaWithUpperNumHyphenUnderScore,
    buildFormSubmitWithTranslations,
    createEntityManager,
    createFormSubmitTranslations,
    defineEntityManagerEvents,
    initFormAttributesFromSource,
    renderEntityAssignAction,
    useTranslation,
    useTranslationsForNestedValidation,
} from '../../core';
import { ARealms } from '../realm';
import { AClientRedirectUris } from './AClientRedirectUris';

export const AClientForm = defineComponent({
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
    emits: defineEntityManagerEvents<Client>(),
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

        const manager = createEntityManager({
            type: `${DomainType.CLIENT}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
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

            initFormAttributesFromSource(form, manager.data.value);

            if (form.secret.length === 0) {
                generateSecret();
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                manager.data.value = props.entity;

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

        const validationMessages = useTranslationsForNestedValidation($v.value);
        const submitTranslations = createFormSubmitTranslations();
        const generateTranslation = useTranslation({
            group: 'form',
            key: 'generate.button',
        });

        const render = () => {
            const name : VNodeChild = [
                buildFormGroup({
                    validationMessages: validationMessages.name.value,
                    dirty: $v.value.name.$dirty,
                    label: true,
                    labelContent: 'Name',
                    content: buildFormInput({
                        value: $v.value.name.$model,
                        onChange(input) {
                            $v.value.name.$model = input;
                        },
                        props: {
                            disabled: isNameFixed.value,
                        },
                    }),
                }),
                h('small', 'Something users will recognize and trust.'),
            ];

            const description : VNodeChild = [
                buildFormGroup({
                    validationMessages: validationMessages.description.value,
                    dirty: $v.value.description.$dirty,
                    label: true,
                    labelContent: 'Description',
                    content: buildFormTextarea({
                        value: $v.value.description.$model,
                        onChange(input) {
                            $v.value.description.$model = input;
                        },
                        props: {
                            rows: 7,
                        },
                    }),
                }),
                h('small', 'This is displayed to all users of this application.'),
            ];

            const redirectUri = [
                h('label', { class: 'form-label' }, [
                    'Redirect Uri(s)',
                ]),
                h(AClientRedirectUris, {
                    uri: form.redirect_uri,
                    onUpdated(value: string) {
                        form.redirect_uri = value;
                    },
                }),
                h('small', 'URI pattern a browser can redirect to after a successful login.'),
            ];

            const isConfidential = buildFormGroup({
                validationMessages: validationMessages.is_confidential.value,
                dirty: $v.value.is_confidential.$dirty,
                label: true,
                labelContent: 'Is Confidential?',
                content: buildFormInputCheckbox({
                    value: $v.value.is_confidential.$model,
                    onChange(input) {
                        $v.value.is_confidential.$model = input;
                    },
                }),
            });

            let id : VNodeArrayChildren = [];

            if (manager.data.value) {
                id = [
                    buildFormGroup({
                        label: true,
                        labelContent: 'ID',
                        content: buildFormInput({
                            value: manager.data.value.id,
                            props: {
                                disabled: true,
                            },
                        }),
                    }),
                ];
            }

            const secret : VNodeArrayChildren = [
                buildFormGroup({
                    validationMessages: validationMessages.secret.value,
                    dirty: $v.value.secret.$dirty,
                    label: true,
                    labelContent: [
                        'Secret',
                    ],
                    content: buildFormInput({
                        value: $v.value.secret.$model,
                        onChange(input) {
                            $v.value.secret.$model = input;
                        },
                    }),
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
                        generateTranslation.value,
                    ]),
                ]),
            ];

            const submitForm = buildFormSubmitWithTranslations({
                busy: busy.value,
                submit,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, submitTranslations);

            let realm : VNodeChild = [];

            if (!isRealmLocked.value) {
                realm = [
                    h('hr'),
                    h('label', { class: 'form-label' }, 'Realm'),
                    h(ARealms, {
                        headerTitle: false,
                    }, {
                        [SlotName.ITEM_ACTIONS]: (
                            props: { data: Realm, busy: boolean },
                        ) => renderEntityAssignAction({
                            item: form.realm_id === props.data.id,
                            busy: props.busy,
                            add() {
                                form.realm_id = props.data.id;
                            },
                            drop() {
                                form.realm_id = '';
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

export default AClientForm;
