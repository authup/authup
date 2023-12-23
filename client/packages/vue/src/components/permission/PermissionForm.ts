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
import {
    helpers, maxLength, minLength, required,
} from '@vuelidate/validators';
import type { Permission } from '@authup/core';
import {
    buildFormGroup, buildFormInput, buildFormSubmit, buildFormTextarea,
} from '@vuecs/form-controls';
import { useIsEditing, useUpdatedAt } from '../../composables';
import {
    createEntityManager, defineEntityManagerEvents,
    initFormAttributesFromSource,
    useTranslator, useValidationTranslator,
} from '../../core';

export const PermissionForm = defineComponent({
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
    emits: defineEntityManagerEvents<Permission>(),
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
                permissionNamePattern: helpers.regex(/^(?:[a-zA-Z-]+_[a-zA-Z-]+)+$/),
            },
            description: {
                minLength: minLength(5),
                maxLength: maxLength(4096),
            },
        }, form);

        const manager = createEntityManager({
            type: `${DomainType.PERMISSION}`,
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

        const render = () => {
            const name = buildFormGroup({
                validationResult: $v.value.name,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Name',
                content: buildFormInput({
                    value: form.name,
                    onChange(input) {
                        form.name = input;
                    },
                    props: {
                        placeholder: '{object}_{action}',
                        disabled: manager.data.value &&
                            manager.data.value.built_in,
                    },
                }),
            });

            const description = buildFormGroup({
                validationResult: $v.value.description,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Description',
                content: buildFormTextarea({

                    value: form.description,
                    onChange(input) {
                        form.description = input;
                    },
                    props: {
                        rows: 4,
                    },
                }),
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
