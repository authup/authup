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

export const AIdentityProviderLdapGroupFields = defineComponent({
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

            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const validationMessages = useTranslationsForNestedValidation($v.value);

        return () => [
            buildFormGroup({
                validationMessages: validationMessages.group_filter.value,
                validationSeverity: getVuelidateSeverity($v.value.group_filter),
                label: true,
                labelContent: 'Filter',
                content: buildFormInput({
                    value: $v.value.group_filter.$model,
                    onChange(input) {
                        $v.value.group_filter.$model = input;
                    },
                    props: {
                        placeholder: '(member={{dn}})',
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.group_base_dn.value,
                validationSeverity: getVuelidateSeverity($v.value.group_base_dn),
                label: true,
                labelContent: 'Base DN',
                content: buildFormInput({
                    value: $v.value.group_base_dn.$model,
                    onChange(input) {
                        $v.value.group_base_dn.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.group_class.value,
                validationSeverity: getVuelidateSeverity($v.value.group_class),
                label: true,
                labelContent: 'Class',
                content: buildFormInput({
                    value: $v.value.group_class.$model,
                    onChange(input) {
                        $v.value.group_class.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.group_name_attribute.value,
                validationSeverity: getVuelidateSeverity($v.value.group_name_attribute),
                label: true,
                labelContent: 'Name Attribute',
                content: buildFormInput({
                    value: $v.value.group_name_attribute.$model,
                    onChange(input) {
                        $v.value.group_name_attribute.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.group_member_attribute.value,
                validationSeverity: getVuelidateSeverity($v.value.group_member_attribute),
                label: true,
                labelContent: 'Member Attribute',
                content: buildFormInput({
                    value: $v.value.group_member_attribute.$model,
                    onChange(input) {
                        $v.value.group_member_attribute.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.group_member_user_attribute.value,
                validationSeverity: getVuelidateSeverity($v.value.group_member_user_attribute),
                label: true,
                labelContent: 'Member User Attribute',
                content: buildFormInput({
                    value: $v.value.group_member_user_attribute.$model,
                    onChange(input) {
                        $v.value.group_member_user_attribute.$model = input;
                    },
                }),
            }),
        ];
    },
});
