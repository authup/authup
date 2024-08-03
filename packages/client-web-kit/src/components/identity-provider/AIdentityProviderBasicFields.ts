/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
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
import {
    TranslatorTranslationDefaultKey,
    TranslatorTranslationGroup,
    VuelidateCustomRule,
    VuelidateCustomRuleKey, extendObjectProperties, getVuelidateSeverity, useTranslationsForGroup, useTranslationsForNestedValidation,
} from '../../core';

export const AIdentityProviderBasicFields = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Partial<IdentityProvider>>,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
        const form = reactive({
            name: '',
            display_name: '',
            slug: '',
            enabled: true,
        });

        const $v = useVuelidate({
            name: {
                required,
                minLength: minLength(5),
                maxLength: maxLength(128),
            },
            display_name: {
                minLength: minLength(3),
                maxLength: maxLength(256),
            },
            slug: {
                required,
                [VuelidateCustomRuleKey.ALPHA_NUM_HYPHEN_UNDERSCORE]: VuelidateCustomRule[VuelidateCustomRuleKey.ALPHA_NUM_HYPHEN_UNDERSCORE],
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

        function assign(data: Partial<IdentityProvider> = {}) {
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

        const translationsDefault = useTranslationsForGroup(
            TranslatorTranslationGroup.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.DISPLAY_NAME },
                { key: TranslatorTranslationDefaultKey.NAME },
                { key: TranslatorTranslationDefaultKey.DESCRIPTION },
            ],
        );
        const translationsValidation = useTranslationsForNestedValidation($v.value);

        return () => {
            const name = buildFormGroup({
                validationMessages: translationsValidation.name.value,
                validationSeverity: getVuelidateSeverity($v.value.name),
                label: true,
                labelContent: translationsDefault[TranslatorTranslationDefaultKey.NAME].value,
                content: buildFormInput({
                    value: $v.value.name.$model,
                    onChange(input) {
                        $v.value.name.$model = input;
                    },
                }),
            });

            const displayName = buildFormGroup({
                validationMessages: translationsValidation.display_name.value,
                validationSeverity: getVuelidateSeverity($v.value.display_name),
                label: true,
                labelContent: translationsDefault[TranslatorTranslationDefaultKey.DISPLAY_NAME].value,
                content: buildFormInput({
                    value: $v.value.display_name.$model,
                    onChange(input) {
                        $v.value.display_name.$model = input;
                    },
                }),
            });

            const slug = buildFormGroup({
                validationMessages: translationsValidation.slug.value,
                validationSeverity: getVuelidateSeverity($v.value.slug),
                label: true,
                labelContent: 'Slug',
                content: buildFormInput({
                    value: $v.value.slug.$model,
                    onChange(input) {
                        $v.value.slug.$model = input;
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
                value: $v.value.enabled.$model,
                onChange(input) {
                    $v.value.enabled.$model = input;
                    update();
                },
            });

            return [
                name,
                displayName,
                slug,
                slugGenerator,
                enabled,
            ];
        };
    },
});
