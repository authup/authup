/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DomainType } from '@authup/core';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent, h, reactive, ref, watch,
} from 'vue';
import { maxLength, minLength, required } from '@vuelidate/validators';
import type { Role } from '@authup/core';
import {
    buildFormInput, buildFormSubmit, buildFormTextarea,
} from '@vue-layout/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    createEntityManager,
    initFormAttributesFromSource,
} from '../../core';
import { useTranslator, useValidationTranslator } from '../../translator';

export const RoleForm = defineComponent({
    name: 'RoleForm',
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
                maxLength: maxLength(30),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        }, form);

        const manager = createEntityManager(`${DomainType.ROLE}`, {
            setup: ctx,
            props,
        });

        const isEditing = useIsEditing(manager.entity);
        const updatedAt = useUpdatedAt(props.entity);

        function initForm() {
            initFormAttributesFromSource(form, manager.entity.value);
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
            const name = buildFormInput({
                validationResult: $v.value.name,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Name',
                value: form.name,
                onChange(input) {
                    form.name = input;
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
                    rows: 6,
                },
            });

            const submitForm = buildFormSubmit({
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
                submitForm,
            ]);
        };

        return () => render();
    },
});

export default RoleForm;
