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
import { required } from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { extendObjectProperties, useValidationTranslator } from '../../core';

export const AIdentityProviderLdapCredentialsFields = defineComponent({
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
            user: '',
            password: '',
        });

        const $v = useVuelidate({
            user: {
                required,
            },
            password: {
                required,
            },
        }, form, {
            $registerAs: 'credentials',
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
                validationResult: $v.value.user,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'User',
                content: buildFormInput({
                    value: form.user,
                    onChange(input) {
                        form.user = input;
                    },
                }),
            }),
            buildFormGroup({
                validationResult: $v.value.password,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                label: true,
                labelContent: 'Password',
                content: buildFormInput({
                    value: form.password,
                    onChange(input) {
                        form.password = input;
                    },
                }),
            }),
        ];
    },
});
