/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core';
import { createNanoID } from '@authup/core';
import { buildFormGroup, buildFormInput, buildFormInputCheckbox } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    computed, defineComponent, h, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { alphaNumHyphenUnderscore, extendObjectProperties } from '../../core';
import { useValidationTranslator } from '../../core/translator';

export const AIdentityProviderBasicFields = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Partial<IdentityProvider>>,
        },
        translatorLocale: {
            type: String,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
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
        }, form, {
            $registerAs: 'basic',
        });

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

        function assign(data?: Partial<IdentityProvider>) {
            extendObjectProperties(form, data);

            if (isSlugEmpty.value) {
                generateId();
            }
        }

        setup.expose({
            assign,
        });

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign(props.entity));

        assign(props.entity);

        return () => {
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
                }),
            });

            const slug = buildFormGroup({
                validationResult: $v.value.slug,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Slug',
                content: buildFormInput({
                    value: form.slug,
                    onChange(input) {
                        form.slug = input;
                        update();
                    },
                }),
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
