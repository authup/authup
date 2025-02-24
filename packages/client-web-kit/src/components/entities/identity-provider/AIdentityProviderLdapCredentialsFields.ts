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
import { required } from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../../composables';
import { assignFormProperties, getVuelidateSeverity, useTranslationsForNestedValidation } from '../../../core';

export const AIdentityProviderLdapCredentialsFields = defineComponent({
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

            assignFormProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const validationMessages = useTranslationsForNestedValidation($v.value);

        return () => [
            buildFormGroup({
                validationMessages: validationMessages.user.value,
                validationSeverity: getVuelidateSeverity($v.value.user),
                label: true,
                labelContent: 'User',
                content: buildFormInput({
                    value: $v.value.user.$model,
                    onChange(input) {
                        $v.value.user.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.password.value,
                validationSeverity: getVuelidateSeverity($v.value.password),
                label: true,
                labelContent: 'Password',
                content: buildFormInput({
                    value: $v.value.password.$model,
                    onChange(input) {
                        $v.value.password.$model = input;
                    },
                }),
            }),
        ];
    },
});
