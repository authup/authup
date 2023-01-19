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
import { REALM_MASTER_NAME, Realm, createNanoID } from '@authup/common';
import {
    buildFormInput,
    buildFormSubmit,
    buildFormTextarea,
} from '@vue-layout/hyperscript';
import {
    alphaWithUpperNumHyphenUnderScore, createSubmitHandler, initFormAttributesFromEntity, useHTTPClient,
} from '../../utils';
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

        const isEditing = computed(() => !!props.entity && !!props.entity.id);
        const isNameEmpty = computed(() => !form.name || form.name.length === 0);
        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

        const generateName = () => {
            form.name = createNanoID();
        };

        function initForm() {
            initFormAttributesFromEntity(form, props.entity);

            if (form.name.length === 0) {
                generateName();
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
            form,
            formIsValid: () => !$v.value.$invalid,
            create: async (data) => useHTTPClient().realm.create(data),
            update: async (id, data) => useHTTPClient().realm.update(id, data),
        });

        const render = () => {
            const id = buildFormInput({
                validationResult: $v.value.name,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'Name',
                value: form.name,
                onChange(input) {
                    form.name = input;
                },
                props: {
                    disabled: props.entity && props.entity.name === REALM_MASTER_NAME,
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
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
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
                updateText: useAuthIlingo().getSync('form.update.button', props.translatorLocale),
                createText: useAuthIlingo().getSync('form.create.button', props.translatorLocale),
                submit,
                busy,
                isEditing,
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
