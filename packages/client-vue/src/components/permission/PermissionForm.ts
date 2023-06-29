/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    computed, defineComponent, h, reactive, ref, watch,
} from 'vue';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { Permission } from '@authup/core';
import { buildFormInput, buildFormSubmit, buildFormTextarea } from '@vue-layout/form-controls';
import {
    createSubmitHandler,
    initFormAttributesFromSource,
} from '../../core/render';
import { useAPIClient } from '../../core';
import { useTranslator, useValidationTranslator } from '../../translator';

export const PermissionForm = defineComponent({
    name: 'PermissionForm',
    props: {
        entity: {
            type: Object as PropType<Permission>,
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

        const isEditing = computed<boolean>(() => typeof props.entity !== 'undefined' && !!props.entity.id);
        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

        function initForm() {
            initFormAttributesFromSource(form, props.entity);
        }

        watch(updatedAt, (val, oldVal) => {
            if (val && val !== oldVal) {
                initForm();
            }
        });

        initForm();

        const submit = createSubmitHandler<Permission>({
            props,
            ctx,
            form,
            formIsValid: () => !$v.value.$invalid,
            create: async (data) => useAPIClient().permission.create(data),
            update: async (id, data) => useAPIClient().permission.update(id, data),
        });

        const render = () => {
            const name = buildFormInput({
                validationResult: $v.value.id,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Name',
                value: form.name,
                onChange(input) {
                    form.name = input;
                },
                props: {
                    placeholder: '{object}_{action}',
                    disabled: props.entity && props.entity.built_in,
                },
            });

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
                name,
                description,
                submitButton,
            ]);
        };

        return () => render();
    },
});
