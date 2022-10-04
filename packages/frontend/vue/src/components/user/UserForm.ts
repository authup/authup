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
import {
    PropType, VNodeArrayChildren, computed, defineComponent, h, reactive, ref, watch,
} from 'vue';

import { Realm, User } from '@authelion/common';
import { initFormAttributesFromEntity } from '../../composables/form';
import { createSubmitHandler, useHTTPClient } from '../../utils';
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
        const isNameLocked = computed(() => props.entity && props.entity.name_locked);

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
            busy,
            form,
            formIsValid: () => $v.value.$invalid,
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
                    disabled: isNameLocked.value,
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

            let activate : VNodeArrayChildren = [];

            if (props.canManage) {
                activate = [
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
                activate,
                h('hr'),
                submitForm,
            ]);

            let rightColumn : VNodeArrayChildren = [];
            if (
                !isRealmLocked.value &&
                props.canManage
            ) {
                const realm = h(RealmList, {}, {
                    [SlotName.ITEM_ACTIONS]: (props: { data: Realm, busy: boolean}) => buildItemActionToggle({
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
