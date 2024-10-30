/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
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
import { DomainType } from '@authup/core-kit';
import {
    buildFormGroup,
    buildFormInput,
    buildFormInputCheckbox,
    buildFormTextarea,
} from '@vuecs/form-controls';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey,
    buildFormSubmitWithTranslations,
    createFormSubmitTranslations,
    createResourceManager,
    defineEntityManagerEvents,
    getVuelidateSeverity,
    initFormAttributesFromSource,
    renderEntityAssignAction,
    useTranslationsForGroup,
    useTranslationsForNestedValidation,
} from '../../core';
import { useIsEditing, useUpdatedAt } from '../../composables';
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
    },
    emits: defineEntityManagerEvents<Client>(),
    setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            name: '',
            display_name: '',
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
                [
                VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE
                ]: VuelidateCustomRule[VuelidateCustomRuleKey.ALPHA_UPPER_NUM_HYPHEN_UNDERSCORE],
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            display_name: {
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

        const manager = createResourceManager({
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

        const translationsValidation = useTranslationsForNestedValidation($v.value);
        const translationsSubmit = createFormSubmitTranslations();

        const translationsClient = useTranslationsForGroup(
            TranslatorTranslationGroup.CLIENT,
            [
                { key: TranslatorTranslationClientKey.NAME_HINT },
                { key: TranslatorTranslationClientKey.DESCRIPTION_HINT },
                { key: TranslatorTranslationClientKey.REDIRECT_URI_HINT },
                { key: TranslatorTranslationClientKey.IS_CONFIDENTIAL },
            ],
        );

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERATE },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
                { key: TranslatorTranslationDefaultKey.REALM },
                { key: TranslatorTranslationDefaultKey.REDIRECT_URIS },
                { key: TranslatorTranslationDefaultKey.SECRET },
            ],
        );

        const render = () => {
            const name : VNodeChild = [
                buildFormGroup({
                    validationMessages: translationsValidation.name.value,
                    validationSeverity: getVuelidateSeverity($v.value.name),
                    label: true,
                    labelContent: translationsDefault[TranslatorTranslationDefaultKey.NAME].value,
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
                h('small', translationsClient[TranslatorTranslationClientKey.NAME_HINT].value),
            ];

            const displayName = buildFormGroup({
                validationMessages: translationsValidation.display_name.value,
                validationSeverity: getVuelidateSeverity($v.value.display_name),
                label: true,
                labelContent: translationsDefault[TranslatorTranslationDefaultKey.DISPLAY_NAME].value,
                content: buildFormInput({
                    value: $v.value.display_name.$model,
                    onChange(input) {
                        $v.value.display_name.$model = input;
                    },
                }),
            });

            const description : VNodeChild = [
                h('div', [
                    buildFormGroup({
                        validationMessages: translationsValidation.description.value,
                        validationSeverity: getVuelidateSeverity($v.value.description),
                        label: true,
                        labelContent: translationsDefault[TranslatorTranslationDefaultKey.DESCRIPTION].value,
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
                    h('small', translationsClient[TranslatorTranslationClientKey.DESCRIPTION_HINT].value),
                ]),
            ];

            const redirectUri = [
                h('div', [
                    h('label', { class: 'form-label' }, [
                        translationsDefault[TranslatorTranslationDefaultKey.REDIRECT_URIS].value,
                    ]),
                    h(AClientRedirectUris, {
                        uri: form.redirect_uri,
                        onUpdated: (value) => {
                            form.redirect_uri = value;
                        },
                    }),
                    h('small', translationsClient[TranslatorTranslationClientKey.REDIRECT_URI_HINT].value),
                ]),
            ];

            const isConfidential = buildFormGroup({
                validationMessages: translationsValidation.is_confidential.value,
                validationSeverity: getVuelidateSeverity($v.value.is_confidential),
                content: buildFormInputCheckbox({
                    groupClass: 'form-switch mt-3',
                    labelContent: translationsClient[TranslatorTranslationClientKey.IS_CONFIDENTIAL].value,
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
                    h('hr'),
                ];
            }

            const secret : VNodeArrayChildren = [
                buildFormGroup({
                    validationMessages: translationsValidation.secret.value,
                    validationSeverity: getVuelidateSeverity($v.value.secret),
                    label: true,
                    labelContent: translationsDefault[TranslatorTranslationDefaultKey.SECRET].value,
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
                        translationsDefault[TranslatorTranslationDefaultKey.GENERATE].value,
                    ]),
                ]),
            ];

            const submitForm = buildFormSubmitWithTranslations({
                busy: busy.value,
                submit,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, translationsSubmit);

            let realm : VNodeChild = [];

            if (!isRealmLocked.value) {
                realm = [
                    h('hr'),
                    h(
                        'label',
                        { class: 'form-label' },
                        translationsDefault[TranslatorTranslationDefaultKey.REALM].value,
                    ),
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
                name,
                h('hr'),
                displayName,
                h('hr'),
                secret,
                realm,
            ]);

            const rightColumn = [
                h('div', {
                    class: 'col',
                }, [
                    isConfidential,
                    h('hr'),
                    redirectUri,
                    h('hr'),
                    description,
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
