/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core-kit';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent, h, reactive, ref, watch,
} from 'vue';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { Role } from '@authup/core-kit';
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

export const ARoleForm = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Role>,
            default: undefined,
        },
        translatorLocale: {
            type: String,
            default: undefined,
        },
    },
    emits: defineEntityManagerEvents<Role>(),
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
                maxLength: maxLength(30),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        }, form);

        const manager = createEntityManager({
            type: `${DomainType.ROLE}`,
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.data);
        const updatedAt = useUpdatedAt(props.entity);

        function initForm() {
            initFormAttributesFromSource(form, manager.data.value);
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
            const name = buildFormGroup({
                validationMessages: validationMessages.name.value,
                dirty: $v.value.name.$dirty,
                label: true,
                labelContent: 'Name',
                content: buildFormInput({
                    value: $v.value.name.$model,
                    onChange(input) {
                        $v.value.name.$model = input;
                    },
                }),
            });

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
                        rows: 6,
                    },
                }),
            });

            const submitForm = buildFormSubmitWithTranslations({
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
                name,
                description,
                submitForm,
            ]);
        };

        return () => render();
    },
});

export default ARoleForm;
