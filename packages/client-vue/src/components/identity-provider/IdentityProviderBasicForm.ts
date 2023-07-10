/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/core';
import { buildFormInput, buildFormInputCheckbox } from '@vue-layout/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required, url,
} from '@vuelidate/validators';
import {
    computed, defineComponent, h, reactive, toRefs,
} from 'vue';
import { onChange } from '../../composables';
import { alphaNumHyphenUnderscore } from '../../core';
import { useValidationTranslator } from '../../translator';

export const IdentityProviderBasicForm = defineComponent({
    name: 'IdentityProviderBasicForm',
    props: {
        name: {
            type: String,
        },
        slug: {
            type: String,
        },
        enabled: {
            type: Boolean,
        },
        translatorLocale: {
            type: String,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const refs = toRefs(props);

        const form = reactive({
            name: '',
            slug: '',
            enabled: true,
        });

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(128),
            },
            slug: {
                required,
                alphaNumHyphenUnderscore,
                minLength: minLength(3),
                maxLength: maxLength(36),
            },
            enabled: {
                required,
            },
        }, form);

        const isSlugEmpty = computed(() => !form.slug || form.slug.length === 0);
        const isNameEmpty = computed(() => !form.name || form.name.length === 0);

        function generateId() {
            const isSame: boolean = form.slug === form.name ||
                (isSlugEmpty.value && isNameEmpty.value);

            form.slug = createNanoID();
            if (isSame) {
                form.name = form.slug;
            }
        }

        const update = () => {
            setup.emit('updated', {
                data: form,
                valid: !$v.value.$invalid,
            });
        };

        function updateForm() {
            if (typeof refs.name.value !== 'undefined') {
                form.name = refs.name.value;
            }

            if (typeof refs.slug.value !== 'undefined') {
                form.slug = refs.slug.value;
            }

            if (typeof refs.enabled.value !== 'undefined') {
                form.enabled = refs.enabled.value;
            }

            if (isSlugEmpty.value) {
                generateId();
            }
        }

        onChange(refs.name, () => updateForm());
        onChange(refs.slug, () => updateForm());
        onChange(refs.enabled, () => updateForm());

        updateForm();

        return () => {
            const name = buildFormInput({
                validationResult: $v.value.name,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Name',
                value: form.name,
                onChange(input) {
                    form.name = input;
                },
            });

            const slug = buildFormInput({
                validationResult: $v.value.slug,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Slug',
                value: form.slug,
                onChange(input) {
                    form.slug = input;
                    update();
                },
            });

            const slugGenerator = h('div', {
                class: 'mb-3',
            }, [
                h('button', {
                    class: 'btn btn-xs btn-dark',
                    onClick($event: any) {
                        $event.preventDefault();

                        generateId.call(null);
                        update();
                    },
                }, [
                    h('i', { class: 'fa fa-wrench' }),
                    ' ',
                    'Generate',
                ]),
            ]);

            const enabled = buildFormInputCheckbox({
                groupClass: 'form-switch mt-3',
                labelContent: 'Enabled?',
                value: form.enabled,
                onChange(input) {
                    form.enabled = input;
                    update();
                },
            });

            return [
                name,
                slug,
                slugGenerator,
                enabled,
            ];
        };
    },
});
