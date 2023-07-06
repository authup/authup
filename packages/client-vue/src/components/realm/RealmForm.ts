/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import type { PropType, VNodeArrayChildren } from 'vue';
import {
    computed, defineComponent, h, reactive, ref, watch,
} from 'vue';
import type { Realm } from '@authup/core';
import {
    DomainType, REALM_MASTER_NAME, User, createNanoID,
} from '@authup/core';
import {
    buildFormInput,
    buildFormSubmit,
    buildFormTextarea,
} from '@vue-layout/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    createEntityManager,
    initFormAttributesFromSource,
} from '../../core';
import { useTranslator, useValidationTranslator } from '../../translator';

export const RealmForm = defineComponent({
    name: 'RealmForm',
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: false,
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
        });

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        }, form);

        const manager = createEntityManager(`${DomainType.REALM}`, {
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.entity);
        const updatedAt = useUpdatedAt(props.entity);
        const isNameEmpty = computed(() => !form.name || form.name.length === 0);

        const generateName = () => {
            form.name = createNanoID();
        };

        function initForm() {
            initFormAttributesFromSource(form, manager.entity.value);

            if (form.name.length === 0) {
                generateName();
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
            const id = buildFormInput({
                validationResult: $v.value.name,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Name',
                value: form.name,
                onChange(input) {
                    form.name = input;
                },
                props: {
                    disabled: manager.entity.value &&
                        manager.entity.value.name === REALM_MASTER_NAME,
                },
            });

            let idHint : VNodeArrayChildren = [];

            if (!manager.entity.value || !manager.entity.value.id) {
                idHint = [
                    h('div', {
                        class: 'mb-3',
                    }, [
                        h('button', {
                            class: ['btn btn-xs', {
                                'btn-dark': isNameEmpty.value,
                                'btn-warning': !isNameEmpty.value,
                            }],
                            onClick($event: any) {
                                $event.preventDefault();

                                generateName.call(null);
                            },
                        }, [
                            h('i', { class: 'fa fa-wrench' }),
                            ' ',
                            'Generate',
                        ]),
                    ]),
                ];
            }

            const description = buildFormTextarea({
                validationResult: $v.value.description,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Description',
                value: form.description,
                onChange(input) {
                    form.description = input;
                },
                props: {
                    rows: 4,
                },
            });

            const submitButton = buildFormSubmit({
                updateText: useTranslator().getSync('form.update.button', props.translatorLocale),
                createText: useTranslator().getSync('form.create.button', props.translatorLocale),
                submit,
                busy,
                isEditing: isEditing.value,
                validationResult: $v.value,
            });

            return h('form', {
                onSubmit($event: any) {
                    $event.preventDefault();

                    return submit.apply(null);
                },
            }, [
                id,
                idHint,
                h('hr'),
                description,
                h('hr'),
                submitButton,
            ]);
        };

        return () => render();
    },
});
