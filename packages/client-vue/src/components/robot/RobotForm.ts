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
    maxLength, minLength, required,
} from '@vuelidate/validators';
import type { Realm, Robot } from '@authup/core';
import { createNanoID } from '@authup/core';
import {
    buildFormInput,
    buildFormSubmit,
} from '@vue-layout/form-controls';
import {
    SlotName,
    buildItemActionToggle,
} from '@vue-layout/list-controls';
import {
    createSubmitHandler,
    initFormAttributesFromSource,
} from '../../core/render';
import {
    alphaWithUpperNumHyphenUnderScore,
    useAPIClient,
} from '../../core';
import { useTranslator, useValidationTranslator } from '../../translator';
import { RealmList } from '../realm';

export const RobotForm = defineComponent({
    name: 'RobotForm',
    props: {
        name: {
            type: String,
            default: undefined,
        },
        entity: {
            type: Object as PropType<Robot>,
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
            realm_id: '',
            secret: '',
        });

        const $v = useVuelidate({
            name: {
                alphaWithUpperNumHyphenUnderScore,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            realm_id: {
                required,
            },
            secret: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
        }, form);

        const isEditing = computed<boolean>(() => typeof props.entity !== 'undefined' && !!props.entity.id);
        const isNameFixed = computed(() => !!props.name && props.name.length > 0);
        const isRealmLocked = computed(() => !!props.realmId);
        const isSecretHashed = computed(() => props.entity && props.entity.secret === form.secret && form.secret.startsWith('$'));
        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

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

            initFormAttributesFromSource(form, props.entity);

            if (form.secret.length === 0) {
                generateSecret();
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                initForm();
            }
        });

        initForm();

        const render = () => {
            const submit = createSubmitHandler<Robot>({
                props,
                ctx,
                form,
                formIsValid: () => !$v.value.$invalid,
                create: (data) => useAPIClient().robot.create(data),
                update: (id, data) => {
                    if (isSecretHashed.value) {
                        delete data.secret;
                    }

                    return useAPIClient().robot.update(id, data);
                },
            });

            const name = buildFormInput({
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
            });

            let id : VNodeArrayChildren = [];

            if (props.entity) {
                id = [
                    buildFormInput({
                        labelContent: 'ID',
                        value: props.entity.id,
                        props: {
                            disabled: true,
                        },
                    }),
                ];
            }

            const secret = buildFormInput({
                validationResult: $v.value.secret,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: [
                    'Secret',
                    isSecretHashed.value ? h('span', {
                        class: 'text-danger font-weight-bold ps-1',
                    }, [
                        'Hashed',
                        ' ',
                        h('i', { class: 'fa fa-exclamation-triangle ps-1' }),
                    ]) : '',
                ],
                value: form.secret,
                onChange(input) {
                    form.secret = input;
                },
            });

            const secretInfo = h('div', [
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
            ]);

            const submitForm = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button', props.translatorLocale),
                createText: useTranslator().getSync('form.create.button', props.translatorLocale),
                busy,
                submit,
                isEditing: isEditing.value,
                validationResult: $v.value,
            });

            const leftColumn = h('div', { class: 'col' }, [
                id,
                name,
                secret,
                secretInfo,
                h('hr'),
                submitForm,
            ]);

            let rightColumn : VNodeArrayChildren = [];

            if (
                !isRealmLocked.value
            ) {
                const realm = h(RealmList, {}, {
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

export default RobotForm;
