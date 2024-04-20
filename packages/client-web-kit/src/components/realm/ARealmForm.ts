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
import type { Realm } from '@authup/core-kit';
import {
    DomainType, REALM_MASTER_NAME, createNanoID,
} from '@authup/core-kit';
import {
    buildFormGroup,
    buildFormInput,
    buildFormTextarea,
} from '@vuecs/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    buildFormSubmitWithTranslations,
    createEntityManager,
    createFormSubmitTranslations,
    defineEntityManagerEvents,
    initFormAttributesFromSource,
    useTranslationsForNestedValidation,
} from '../../core';

export const ARealmForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Realm>,
            required: false,
            default: undefined,
        },
    },
    emits: defineEntityManagerEvents<Realm>(),
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

        const manager = createEntityManager({
            type: `${DomainType.REALM}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);
        const isNameEmpty = computed(() => !form.name || form.name.length === 0);

        const generateName = () => {
            form.name = createNanoID();
        };

        function initForm() {
            initFormAttributesFromSource(form, manager.data.value);

            if (form.name.length === 0) {
                generateName();
            }
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

        const validationMessages = useTranslationsForNestedValidation($v.value);
        const submitTranslations = createFormSubmitTranslations();

        const render = () => {
            const id = buildFormGroup({
                validationMessages: validationMessages.name.value,
                dirty: $v.value.name.$dirty,
                label: true,
                labelContent: 'Name',
                content: buildFormInput({
                    value: $v.value.name.$model,
                    onChange(input) {
                        $v.value.name.$model = input;
                    },
                    props: {
                        disabled: manager.data.value &&
                            manager.data.value.name === REALM_MASTER_NAME,
                    },
                }),
            });

            let idHint : VNodeArrayChildren = [];

            if (!manager.data.value || !manager.data.value.id) {
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

            const description = buildFormGroup({
                validationMessages: validationMessages.description.value,
                dirty: $v.value.description.$dirty,
                label: true,
                labelContent: 'Description',
                content: buildFormTextarea({
                    value: $v.value.description.$model,
                    onChange(input) {
                        $v.value.description.$model = input;
                    },
                    props: {
                        rows: 4,
                    },
                }),
            });

            const submitButton = buildFormSubmitWithTranslations({
                submit,
                busy: busy.value,
                isEditing: isEditing.value,
                invalid: $v.value.$invalid,
            }, submitTranslations);

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
