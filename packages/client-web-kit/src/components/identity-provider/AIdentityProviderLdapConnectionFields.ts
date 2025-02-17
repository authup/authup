/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider, LdapIdentityProvider,
} from '@authup/core-kit';
import { buildFormGroup, buildFormInput, buildFormInputCheckbox } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    numeric, required,
} from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { assignFormProperties, getVuelidateSeverity, useTranslationsForNestedValidation } from '../../core';

export const AIdentityProviderLdapConnectionFields = defineComponent({
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
            url: '',
            timeout: 0,
            start_tls: true,
            base_dn: '',
        });

        const $v = useVuelidate({
            url: {
                required,
            },
            timeout: {
                numeric,
            },
            start_tls: {
                required,
            },
            base_dn: {
                required,
            },
        }, form, {
            $registerAs: 'connection',
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
                validationMessages: validationMessages.url.value,
                validationSeverity: getVuelidateSeverity($v.value.url),
                label: true,
                labelContent: 'URL',
                content: buildFormInput({
                    value: $v.value.url.$model,
                    onChange(input) {
                        $v.value.url.$model = input;
                    },
                    props: {
                        placeholder: '<scheme>://<address>:<port>',
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.timeout.value,
                validationSeverity: getVuelidateSeverity($v.value.timeout),
                label: true,
                labelContent: 'Timeout',
                content: buildFormInput({
                    value: $v.value.timeout.$model,
                    onChange(input) {
                        const intValue = Number.parseInt(input, 10);
                        if (!Number.isNaN(intValue)) {
                            $v.value.timeout.$model = intValue;
                        }
                    },
                    props: {
                        type: 'number',
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.start_tls.value,
                validationSeverity: getVuelidateSeverity($v.value.start_tls),
                label: true,
                labelContent: 'StartTLS',
                content: buildFormInputCheckbox({
                    groupClass: 'form-switch',
                    labelContent: 'Enable StartTLS process?',
                    value: $v.value.start_tls.$model,
                    onChange(input) {
                        $v.value.start_tls.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.base_dn.value,
                validationSeverity: getVuelidateSeverity($v.value.base_dn),
                label: true,
                labelContent: 'Base DN',
                content: buildFormInput({
                    value: $v.value.base_dn.$model,
                    onChange(input) {
                        $v.value.base_dn.$model = input;
                    },
                    props: {
                        placeholder: 'e.g. dc=example,dc=com',
                    },
                }),
            }),
        ];
    },
});
