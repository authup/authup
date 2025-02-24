/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength } from '@vuelidate/validators';
import type { PropType, VNodeArrayChildren } from 'vue';
import {
    defineComponent, h, reactive, ref,
} from 'vue';
import type { IdentityProviderRoleMapping, Role } from '@authup/core-kit';
import { buildFormGroup, buildFormInput, buildFormInputCheckbox } from '@vuecs/form-controls';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    assignFormProperties,
    getVuelidateSeverity,
    useTranslationsForGroup,
    useTranslationsForNestedValidation,
} from '../../../core';
import {
    defineEntityManager,
    defineEntityVEmitOptions,
} from '../../utility';

export const AIdentityProviderRoleAssignment = defineComponent({
    props: {
        role: {
            type: Object as PropType<Role>,
            required: true,
        },
        entityId: {
            type: String,
            required: true,
        },
    },
    emits: defineEntityVEmitOptions<IdentityProviderRoleMapping>(),
    async setup(props, setup) {
        const display = ref(false);
        const toggleDisplay = () => {
            display.value = !display.value;
        };

        const form = reactive({
            name: '',
            value: '',
            value_is_regex: false,
        });

        const $v = useVuelidate({
            name: {
                minLength: minLength(3),
                maxLength: maxLength(32),
            },
            value: {
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            value_is_regex: {

            },
        }, form);

        const validationMessages = useTranslationsForNestedValidation($v.value);
        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.VALUE_IS_REGEX },
            ],
        );

        const manager = defineEntityManager({
            type: `${EntityType.IDENTITY_PROVIDER_ROLE_MAPPING}`,
            setup,
            socket: {
                processEvent(event) {
                    return event.data.role_id === props.role.id &&
                        event.data.provider_id === props.entityId;
                },
            },
        });

        await manager.resolve({
            query: {
                filters: {
                    role_id: props.role.id,
                    provider_id: props.entityId,
                },
            },
        });

        if (manager.data.value) {
            assignFormProperties(form, manager.data.value);
        }

        const render = () => {
            let displayButton : VNodeArrayChildren = [];

            displayButton = [h('button', {
                class: 'btn btn-xs btn-dark',
                onClick($event: any) {
                    $event.preventDefault();

                    toggleDisplay.call(null);
                },
            }, [
                h('i', {
                    class: ['fa', {
                        'fa-chevron-down': !display.value,
                        'fa-chevron-up': display.value,
                    }],
                }),
            ])];

            let dropAction : VNodeArrayChildren = [];

            if (manager.data.value) {
                dropAction = [
                    h('button', {
                        class: 'btn btn-xs btn-danger ms-1',
                        disabled: $v.value.$invalid || manager.busy.value,
                        onClick($event: any) {
                            $event.preventDefault();

                            return manager.delete();
                        },
                    }, [
                        h('i', {
                            class: ['fa fa-trash'],
                        }),
                    ]),
                ];
            }

            const itemActions = h('div', {
                class: 'ms-auto',
            }, [
                h('button', {
                    class: ['btn btn-xs', {
                        'btn-primary': !manager.data.value,
                        'btn-dark': !!manager.data.value,
                    }],
                    onClick($event: any) {
                        $event.preventDefault();

                        if (manager.data.value) {
                            return manager.update(form);
                        }

                        return manager.create({
                            ...form,
                            provider_id: props.entityId,
                            role_id: props.role.id,
                        });
                    },
                }, [
                    h('i', {
                        class: ['fa', {
                            'fa-plus': !manager.data.value,
                            'fa-save': manager.data.value,
                        }],
                    }),
                ]),
                dropAction,
            ]);

            const listBar = h('div', {
                class: 'd-flex flex-row',
            }, [
                h('div', {
                    class: 'me-2',
                }, [
                    displayButton,
                ]),
                h('div', [
                    h('h6', {
                        class: 'mb-0',
                        onClick($event: any) {
                            $event.preventDefault();

                            toggleDisplay.call(null);
                        },
                    }, [props.role.name]),
                ]),
                itemActions,
            ]);

            let renderForm : VNodeArrayChildren = [];

            if (display.value) {
                renderForm = [
                    h('div', {
                        class: 'mt-2',
                    }, [
                        buildFormGroup({
                            label: true,
                            labelContent: 'Name',
                            validationMessages: validationMessages.name.value,
                            validationSeverity: getVuelidateSeverity($v.value.name),
                            content: buildFormInput({
                                value: $v.value.name.$model,
                                onChange(input) {
                                    $v.value.name.$model = input;
                                },
                            }),
                        }),
                        buildFormGroup({
                            label: true,
                            labelContent: 'Value',
                            validationMessages: validationMessages.value.value,
                            validationSeverity: getVuelidateSeverity($v.value.value),
                            content: buildFormInput({
                                value: $v.value.value.$model,
                                onChange(input) {
                                    $v.value.value.$model = input;
                                },
                            }),
                        }),
                        buildFormGroup({
                            validationMessages: validationMessages.value_is_regex.value,
                            validationSeverity: getVuelidateSeverity($v.value.value_is_regex),
                            label: true,
                            labelContent: 'Regex',
                            content: buildFormInputCheckbox({
                                groupClass: 'form-switch',
                                labelContent: translationsDefault.valueIsRegex.value,
                                value: $v.value.value_is_regex.$model,
                                onChange(input) {
                                    $v.value.value_is_regex.$model = input;
                                },
                            }),
                        }),
                    ]),
                ];
            }

            return h('div', { class: 'list-item flex-column' }, [
                listBar,
                renderForm,
            ]);
        };

        return () => render();
    },
});

export default AIdentityProviderRoleAssignment;
