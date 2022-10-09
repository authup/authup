/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import useVuelidate from '@vuelidate/core';
import {
    PropType, computed, defineComponent, h, reactive, ref, watch,
} from 'vue';
import { maxLength, minLength, required } from '@vuelidate/validators';
import { Permission } from '@authelion/common';
import { buildFormInput, buildFormSubmit } from '@vue-layout/hyperscript';
import { initFormAttributesFromEntity } from '../../composables/form';
import { createSubmitHandler, useHTTPClient } from '../../utils';
import { useAuthIlingo } from '../../language/singleton';
import { buildVuelidateTranslator } from '../../language/utils';

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
            id: '',
        });

        const $v = useVuelidate({
            id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(30),
            },
        }, form);

        const isEditing = computed<boolean>(() => typeof props.entity !== 'undefined' && !!props.entity.id);
        const updatedAt = computed(() => (props.entity ? props.entity.updated_at : undefined));

        function initForm() {
            initFormAttributesFromEntity(form, props.entity);
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
            create: async (data) => useHTTPClient().permission.create({ id: data.id as string }),
            update: async (id, data) => useHTTPClient().permission.update(id, { id: data.id as string }),
        });

        const render = () => {
            const id = buildFormInput({
                validationResult: $v.value.id,
                validationTranslator: buildVuelidateTranslator(props.translatorLocale),
                labelContent: 'ID',
                value: form.id,
                onChange(input) {
                    form.id = input;
                },
                props: {
                    disabled: isEditing.value,
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
                submitButton,
            ]);
        };

        return () => render();
    },
});
