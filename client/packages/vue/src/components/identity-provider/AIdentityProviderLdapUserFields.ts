/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider, LdapIdentityProvider,
} from '@authup/core';
import { buildFormGroup, buildFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { extendObjectProperties, useValidationTranslator } from '../../core';

export const AIdentityProviderLdapUserFields = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Partial<LdapIdentityProvider>>,
        },
        discovery: {
            type: Boolean,
            default: false,
        },
        translatorLocale: {
            type: String,
        },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            user_filter: '',
            user_base_dn: '',
            user_name_attribute: '',
            user_mail_attribute: '',
            user_display_name_attribute: '',
        } satisfies Omit<LdapIdentityProvider, keyof IdentityProvider | 'base_dn' | 'url'>);

        const $v = useVuelidate({
            user_filter: {},
            user_base_dn: {},
            user_name_attribute: {},
            user_mail_attribute: {},
            user_display_name_attribute: {},
        }, form, {
            $registerAs: 'user',
        });

        function init() {
            if (!props.entity) return;

            extendObjectProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        return () => [
            buildFormGroup({
                validationResult: $v.value.user_filter,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Filter',
                content: buildFormInput({
                    value: form.user_filter,
                    onChange(input) {
                        form.user_filter = input;
                    },
                    props: {
                        placeholder: '(|({name_attribute}={{input}})({mail_attribute}={{input}}))',
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.user_base_dn,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Base DN',
                content: buildFormInput({
                    value: form.user_base_dn,
                    onChange(input) {
                        form.user_base_dn = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.user_name_attribute,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Name Attribute',
                content: buildFormInput({
                    value: form.user_name_attribute,
                    onChange(input) {
                        form.user_name_attribute = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.user_mail_attribute,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Mail Attribute',
                content: buildFormInput({
                    value: form.user_mail_attribute,
                    onChange(input) {
                        form.user_mail_attribute = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.user_display_name_attribute,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'DisplayName Attribute',
                content: buildFormInput({
                    value: form.user_display_name_attribute,
                    onChange(input) {
                        form.user_display_name_attribute = input;
                    },
                }),
            }),
        ];
    },
});
