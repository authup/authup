/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import {
    PropType,
    VNodeArrayChildren,
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
import { Realm, Robot, createNanoID } from '@authup/common';
import {
    SlotName,
    buildFormInput,
    buildFormSubmit, buildItemActionToggle,
} from '@vue-layout/hyperscript';
import {
    alphaWithUpperNumHyphenUnderScore,
    createSubmitHandler,
    initFormAttributesFromEntity,
    useHTTPClient,
} from '../../utils';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';
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

            initFormAttributesFromEntity(form, props.entity);

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
                create: (data) => useHTTPClient().robot.create(data),
                update: (id, data) => {
                    if (isSecretHashed.value) {
                        delete data.secret;
                    }

                    return useHTTPClient().robot.update(id, data);
                },
            });

            const name = buildFormInput({
                validationResult: $v.value.name,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
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
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: [
                    'Secret',
                    isSecretHashed.value ? h('span', {
                        class: 'text-danger font-weight-bold pl-1',
                    }, [
                        'Hashed',
                        ' ',
                        h('i', { class: 'fa fa-exclamation-triangle pl-1' }),
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
                    useAuthIlingo().getSync('form.generate.button', props.translatorLocale),
                ]),
            ]);

            const submitForm = buildFormSubmit({
                updateText: useAuthIlingo().getSync('form.update.button', props.translatorLocale),
                createText: useAuthIlingo().getSync('form.create.button', props.translatorLocale),
                busy,
                submit,
                isEditing,
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
