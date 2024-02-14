/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    IdentityProvider, LdapIdentityProvider,
} from '@authup/core';
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
import { extendObjectProperties, useValidationTranslator } from '../../core';

export const AIdentityProviderLdapConnectionFields = defineComponent({
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

            extendObjectProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        return () => [
            buildFormGroup({
                validationResult: $v.value.url,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'URL',
                content: buildFormInput({
                    value: form.url,
                    onChange(input) {
                        form.url = input;
                    },
                    props: {
                        placeholder: '<scheme>://<address>:<port>',
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.timeout,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Timeout',
                content: buildFormInput({
                    value: form.timeout,
                    onChange(input) {
                        form.timeout = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.start_tls,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'StartTLS',
                content: buildFormInputCheckbox({
                    groupClass: 'form-switch',
                    labelContent: 'Enable StartTLS process?',
                    value: form.start_tls,
                    onChange(input) {
                        form.start_tls = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.base_dn,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Base DN',
                content: buildFormInput({
                    value: form.base_dn,
                    onChange(input) {
                        form.base_dn = input;
                    },
                }),
            }),
        ];
    },
});
