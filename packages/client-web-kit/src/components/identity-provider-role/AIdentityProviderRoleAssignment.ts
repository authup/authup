/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { PropType, VNodeArrayChildren } from 'vue';
import {
    computed, defineComponent, h, reactive, ref,
} from 'vue';
import type { IdentityProviderRoleMapping, Role } from '@authup/core-kit';
import { buildFormGroup, buildFormInput } from '@vuecs/form-controls';
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    createEntityManager, defineEntityManagerEvents, getVuelidateSeverity, initFormAttributesFromSource,
    useTranslation, useTranslationsForBaseValidation,
} from '../../core';

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
    emits: defineEntityManagerEvents<IdentityProviderRoleMapping>(),
    async setup(props, setup) {
        const display = ref(false);
        const toggleDisplay = () => {
            display.value = !display.value;
        };

        const form = reactive({
            external_id: '',
        });

        const $v = useVuelidate({
            external_id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
        }, form);

        const validationMessages = useTranslationsForBaseValidation($v.value.external_id);
        const translationExternalID = useTranslation({
            group: TranslatorTranslationGroup.DEFAULT,
            key: TranslatorTranslationDefaultKey.EXTERNAL_ID,
        });

        const isExternalIDDefined = computed(() => form.external_id && form.external_id.length > 0);

        const manager = createEntityManager({
            type: `${DomainType.IDENTITY_PROVIDER_ROLE}`,
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
            initFormAttributesFromSource(form, manager.data.value);
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
                    disabled: !isExternalIDDefined.value,
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
                            labelContent: translationExternalID.value,
                            validationMessages: validationMessages.value,
                            validationSeverity: getVuelidateSeverity($v.value.external_id),
                            content: buildFormInput({
                                value: $v.value.external_id.$model,
                                onChange(input) {
                                    $v.value.external_id.$model = input;
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
