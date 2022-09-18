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
import {
    PropType, VNodeArrayChildren, computed, defineComponent, h, reactive, ref, watch,
} from 'vue';
import { Realm, createNanoID } from '@authelion/common';
import {
    buildFormInput,
    buildFormSubmit,
    buildFormTextarea,
} from '@vue-layout/utils';
import { initFormAttributesFromEntity } from '../../composables/form';
import { alphaNumHyphenUnderscore, createSubmitHandler, useHTTPClient } from '../../utils';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';

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
            id: '',
            name: '',
            description: '',
        });

        const $v = useVuelidate({
            id: {
                required,
                alphaNumHyphenUnderscore,
                minLength: minLength(3),
                maxLength: maxLength(36),
            },
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(100),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        }, form);

        const isIDEmpty = computed(() => !form.id || form.id.length === 0);
        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

        const generateID = () => {
            form.id = createNanoID();
        };

        function initForm() {
            initFormAttributesFromEntity(form, props.entity);

            if (form.id.length === 0) {
                generateID();
            }
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                initForm();
            }
        });

        initForm();

        const submit = createSubmitHandler<Realm>({
            props,
            ctx,
            busy,
            form,
            formIsValid: () => !$v.value.$invalid,
            create: async (data) => useHTTPClient().realm.create(data),
            update: async (id, data) => useHTTPClient().realm.update(id, data),
        });

        const render = () => {
            const id = buildFormInput({
                validationResult: $v.value.id,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'ID',
                value: form.id,
                change(input) {
                    form.id = input;
                },
                props: {
                    disabled: props.entity && props.entity.id,
                },
            });

            let idHint : VNodeArrayChildren = [];

            if (!props.entity || !props.entity.id) {
                idHint = [
                    h('div', {
                        class: 'mb-3',
                    }, [
                        h('button', {
                            class: ['btn btn-xs', {
                                'btn-dark': isIDEmpty.value,
                                'btn-warning': !isIDEmpty.value,
                            }],
                            onClick($event: any) {
                                $event.preventDefault();

                                generateID.call(null);
                            },
                        }, [
                            h('i', { class: 'fa fa-wrench' }),
                            ' ',
                            'Generate',
                        ]),
                    ]),
                ];
            }

            const name = buildFormInput({
                validationResult: $v.value.name,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'Name',
                value: form.name,
                change(input) {
                    form.name = input;
                },
            });

            const description = buildFormTextarea({
                validationResult: $v.value.description,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'Description',
                value: form.description,
                change(input) {
                    form.description = input;
                },
                props: {
                    rows: 4,
                },
            });

            const submitButton = buildFormSubmit({
                updateText: useAuthIlingo().getSync('form.update.button', props.translatorLocale),
                createText: useAuthIlingo().getSync('form.create.button', props.translatorLocale),
                submit,
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
                name,
                h('hr'),
                description,
                h('hr'),
                submitButton,
            ]);
        };
    },
});
