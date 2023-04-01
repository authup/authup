/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    SlotName,
    buildFormInput,
    buildFormInputCheckbox,
    buildFormSubmit, buildItemActionToggle,
} from '@vue-layout/hyperscript';
import useVuelidate from '@vuelidate/core';
import {
    email, maxLength, minLength, required,
} from '@vuelidate/validators';
import type { PropType, VNodeArrayChildren } from 'vue';
import {
    computed, defineComponent, h, reactive, ref, watch,
} from 'vue';

import type { Realm, User } from '@authup/core';
import { createSubmitHandler, initFormAttributesFromEntity, useHTTPClient } from '../../utils';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';
import { RealmList } from '../realm';

export const UserForm = defineComponent({
    name: 'UserForm',
    props: {
        entity: {
            type: Object as PropType<Partial<User>>,
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
        translatorLocale: {
            type: String,
            default: undefined,
        },
    },
    emits: ['created', 'deleted', 'updated', 'failed'],
    setup(props, ctx) {
        const busy = ref(false);
        const displayNameChanged = ref(false);
        const form = reactive({
            active: true,
            name: '',
            name_locked: true,
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
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
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

        const isEditing = computed<boolean>(() => typeof props.entity !== 'undefined' && !!props.entity.id);
        const isRealmLocked = computed(() => !!props.realmId);

        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

        function initForm() {
            if (props.realmId) {
                form.realm_id = props.realmId;
            }

            initFormAttributesFromEntity(form, props.entity);
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                initForm();
            }
        });

        initForm();

        const submit = createSubmitHandler<User>({
            props,
            ctx,
            form,
            formIsValid: () => !$v.value.$invalid,
            create: async (data) => useHTTPClient().user.create(data),
            update: async (id, data) => useHTTPClient().user.update(id, data),
        });

        const updateDisplayName = (value: string) => {
            if (!displayNameChanged.value) {
                form.display_name = value;
            }
        };

        const handleDisplayNameChanged = (value: string) => {
            displayNameChanged.value = value.length !== 0;
        };
        const render = () => {
            const name = buildFormInput({
                validationResult: $v.value.name,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'Name',
                value: form.name,
                onChange(input) {
                    form.name = input;
                    updateDisplayName.call(null, input);
                },
                props: {
                    disabled: form.name_locked,
                },
            });

            const displayName = buildFormInput({
                validationResult: $v.value.display_name,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'Display Name',
                value: form.display_name,
                onChange(input) {
                    form.display_name = input;
                    handleDisplayNameChanged.call(null, input);
                },
            });

            const email = buildFormInput({
                validationResult: $v.value.email,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'Email',
                value: form.email,
                props: {
                    type: 'email',
                    placeholder: '...@...',
                },
                onChange(value) {
                    form.email = value;
                },
            });

            let checks : VNodeArrayChildren = [];

            if (props.canManage) {
                checks = [
                    h('div', { class: 'row' }, [
                        h('div', { class: 'col' }, [
                            buildFormInputCheckbox({
                                groupClass: 'form-switch mt-3',
                                labelContent: h('span', {
                                    class: {
                                        'text-warning': !form.active,
                                        'text-success': form.active,
                                    },
                                }, [form.active ? 'active' : 'inactive']),
                                value: form.active,
                                onChange(input) {
                                    form.active = input;
                                },
                            }),
                        ]),
                        h('div', { class: 'col' }, [
                            buildFormInputCheckbox({
                                groupClass: 'form-switch mt-3',
                                labelContent: h('span', {
                                    class: {
                                        'text-warning': !form.name_locked,
                                        'text-success': form.name_locked,
                                    },
                                }, [form.name_locked ? 'locked' : 'not locked']), // todo: add translation
                                value: form.name_locked,
                                onChange(input) {
                                    form.name_locked = input;
                                },
                            }),
                        ]),
                    ]),

                ];
            }

            const submitForm = buildFormSubmit({
                updateText: useAuthIlingo().getSync('form.update.button', props.translatorLocale),
                createText: useAuthIlingo().getSync('form.create.button', props.translatorLocale),
                submit,
                busy,
                isEditing: isEditing.value,
                validationResult: $v.value,
            });

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
                const realm = h(RealmList, {}, {
                    [SlotName.ITEM_ACTIONS]: (props: { data: Realm, busy: boolean }) => buildItemActionToggle({
                        value: props.data.id,
                        currentValue: form.realm_id,
                        busy: props.busy,
                        onChange(value) {
                            form.realm_id = value as string;
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

export default UserForm;
