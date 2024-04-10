/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider, LdapIdentityProvider,
} from '@authup/core-kit';
import { buildFormGroup, buildFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { extendObjectProperties, useValidationTranslator } from '../../core';

export const AIdentityProviderLdapGroupFields = defineComponent({
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
            group_filter: '',
            group_base_dn: '',
            group_name_attribute: '',
            group_class: '',
            group_member_attribute: '',
            group_member_user_attribute: '',
        });

        const $v = useVuelidate({
            group_filter: {},
            group_base_dn: {},
            group_name_attribute: {},
            group_class: {},
            group_member_attribute: {},
            group_member_user_attribute: {},
        }, form, {
            $registerAs: 'group',
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
                validationResult: $v.value.group_filter,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Filter',
                content: buildFormInput({
                    value: form.group_filter,
                    onChange(input) {
                        form.group_filter = input;
                    },
                    props: {
                        placeholder: '(member={{dn}})',
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.group_base_dn,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Base DN',
                content: buildFormInput({
                    value: form.group_base_dn,
                    onChange(input) {
                        form.group_base_dn = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.group_class,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Class',
                content: buildFormInput({
                    value: form.group_class,
                    onChange(input) {
                        form.group_class = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.group_name_attribute,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Name Attribute',
                content: buildFormInput({
                    value: form.group_name_attribute,
                    onChange(input) {
                        form.group_name_attribute = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.group_member_attribute,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Member Attribute',
                content: buildFormInput({
                    value: form.group_member_attribute,
                    onChange(input) {
                        form.group_member_attribute = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.group_member_user_attribute,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Member User Attribute',
                content: buildFormInput({
                    value: form.group_member_user_attribute,
                    onChange(input) {
                        form.group_member_user_attribute = input;
                    },
                }),
            }),
        ];
    },
});
