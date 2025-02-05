/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, User } from '@authup/core-kit';
import { DomainType } from '@authup/core-kit';
import {
    buildFormGroup, buildFormInput, buildFormInputCheckbox,
} from '@vuecs/form-controls';
import { SlotName } from '@vuecs/list-controls';
import useVuelidate from '@vuelidate/core';
import {
    email, maxLength, minLength, required,
} from '@vuelidate/validators';
import type { PropType, VNodeArrayChildren } from 'vue';
import {
    computed, defineComponent, h, reactive, ref, watch,
} from 'vue';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup, buildFormSubmitWithTranslations,
    createFormSubmitTranslations,
    createResourceManager,
    defineResourceVEmitOptions, getVuelidateSeverity, initFormAttributesFromSource,
    useTranslationsForGroup, useTranslationsForNestedValidation,
} from '../../core';
import {
    renderToggleButton,
} from '../utility';
import { ARealms } from '../realm';

export const AUserForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<User>,
            default: undefined,
        },
        realmId: {
            type: String,
            default: undefined,
        },
        canManage: {
            type: Boolean,
            default: true,
        },
    },
    emits: defineResourceVEmitOptions<User>(),
    async setup(props, ctx) {
        const busy = ref(false);
        const form = reactive({
            active: true,
            name: '',
            name_locked: false,
            display_name: '',
            email: '',
            realm_id: '',
        });

        const $v = useVuelidate({
            active: {

            },
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            name_locked: {

            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            email: {
                minLength: minLength(5),
                maxLength: maxLength(255),
                email,
            },
            realm_id: {
                required,
            },
        }, form);

        const manager = createResourceManager({
            type: `${DomainType.USER}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);

        const isRealmLocked = computed(() => !!props.realmId);

        function initForm() {
            if (props.realmId) {
                form.realm_id = props.realmId;
            }

            if (
                !!manager.data.value &&
                typeof manager.data.value.name_locked !== 'undefined'
            ) {
                form.name_locked = manager.data.value.name_locked;
            }

            initFormAttributesFromSource(form, manager.data.value);
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

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.ACTIVE },
                { key: TranslatorTranslationDefaultKey.INACTIVE },
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.EMAIL },
                { key: TranslatorTranslationDefaultKey.LOCKED },
                { key: TranslatorTranslationDefaultKey.NOT_LOCKED },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
            ],
        );

        const render = () => {
            const name = buildFormGroup({
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
                        disabled: form.name_locked,
                    },
                }),
            });

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

            const email = buildFormGroup({
                validationMessages: translationsValidation.email.value,
                validationSeverity: getVuelidateSeverity($v.value.email),
                label: true,
                labelContent: translationsDefault[TranslatorTranslationDefaultKey.EMAIL].value,
                content: buildFormInput({
                    value: $v.value.email.$model,
                    props: {
                        type: 'email',
                        placeholder: '...@...',
                    },
                    onChange(value) {
                        $v.value.email.$model = value;
                    },
                }),
            });

            let checks : VNodeArrayChildren = [];

            if (props.canManage) {
                let nameLock : VNodeArrayChildren = [];
                if (props.entity) {
                    nameLock = [
                        buildFormInputCheckbox({
                            groupClass: 'form-switch mt-3',
                            labelContent: h('span', {
                                class: {
                                    'text-warning': !form.name_locked,
                                    'text-success': form.name_locked,
                                },
                            }, [form.name_locked ?
                                translationsDefault[TranslatorTranslationDefaultKey.LOCKED].value :
                                translationsDefault[TranslatorTranslationDefaultKey.NOT_LOCKED].value,
                            ]), // todo: add translation
                            value: form.name_locked,
                            onChange(input) {
                                form.name_locked = input;
                            },
                        }),
                    ];
                }

                checks = [
                    h('div', { class: 'row' }, [
                        h('div', { class: 'col' }, [
                            buildFormInputCheckbox({
                                groupClass: 'form-switch mt-3',
                                labelContent: h('span', {
                                    class: {
                                        'text-danger': !form.active,
                                        'text-success': form.active,
                                    },
                                }, [form.active ?
                                    translationsDefault[TranslatorTranslationDefaultKey.ACTIVE].value :
                                    translationsDefault[TranslatorTranslationDefaultKey.INACTIVE].value,
                                ]),
                                value: form.active,
                                onChange(input) {
                                    form.active = input;
                                },
                            }),
                        ]),
                        h('div', { class: 'col' }, [
                            nameLock,
                        ]),
                    ]),

                ];
            }

            const submitForm = buildFormSubmitWithTranslations({
                submit,
                busy: busy.value,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, translationsSubmit);

            const leftColumn = h('div', { class: 'col' }, [
                name,
                displayName,
                email,
                checks,
                h('hr'),
                submitForm,
            ]);

            let rightColumn : VNodeArrayChildren = [];

            if (
                props.canManage &&
                !isRealmLocked.value
            ) {
                const realm = h(ARealms, {}, {
                    [SlotName.ITEM_ACTIONS]: (props: { data: Realm, busy: boolean }) => renderToggleButton({
                        value: form.realm_id === props.data.id,
                        isBusy: props.busy,
                        changed(value) {
                            if (value) {
                                form.realm_id = props.data.id;
                            } else {
                                form.realm_id = '';
                            }
                        },
                    }),
                });

                rightColumn = [
                    h('div', {
                        class: 'col',
                    }, [
                        realm,
                    ]),
                ];
            }

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

export default AUserForm;
