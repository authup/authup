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
import { assignFormProperties, getVuelidateSeverity, useTranslationsForNestedValidation } from '../../core';

export const AIdentityProviderLdapUserFields = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Partial<LdapIdentityProvider>>,
        },
        discovery: {
            type: Boolean,
            default: false,
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

            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const validationMessages = useTranslationsForNestedValidation($v.value);

        return () => [
            buildFormGroup({
                validationMessages: validationMessages.user_filter.value,
                validationSeverity: getVuelidateSeverity($v.value.user_filter),
                label: true,
                labelContent: 'Filter',
                content: buildFormInput({
                    value: $v.value.user_filter.$model,
                    onChange(input) {
                        $v.value.user_filter.$model = input;
                    },
                    props: {
                        placeholder: '(|({name_attribute}={{input}})({mail_attribute}={{input}}))',
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.user_base_dn.value,
                validationSeverity: getVuelidateSeverity($v.value.user_base_dn),
                label: true,
                labelContent: 'Base DN',
                content: buildFormInput({
                    value: $v.value.user_base_dn.$model,
                    onChange(input) {
                        $v.value.user_base_dn.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.user_name_attribute.value,
                validationSeverity: getVuelidateSeverity($v.value.user_name_attribute),
                label: true,
                labelContent: 'Name Attribute',
                content: buildFormInput({
                    value: $v.value.user_name_attribute.$model,
                    onChange(input) {
                        $v.value.user_name_attribute.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.user_mail_attribute.value,
                validationSeverity: getVuelidateSeverity($v.value.user_mail_attribute),
                label: true,
                labelContent: 'Mail Attribute',
                content: buildFormInput({
                    value: $v.value.user_mail_attribute.$model,
                    onChange(input) {
                        $v.value.user_mail_attribute.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.user_display_name_attribute.value,
                validationSeverity: getVuelidateSeverity($v.value.user_display_name_attribute),
                label: true,
                labelContent: 'DisplayName Attribute',
                content: buildFormInput({
                    value: $v.value.user_display_name_attribute.$model,
                    onChange(input) {
                        $v.value.user_display_name_attribute.$model = input;
                    },
                }),
            }),
        ];
    },
});
