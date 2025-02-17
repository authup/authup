/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import { buildFormGroup, buildFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    defineComponent, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { assignFormProperties, getVuelidateSeverity, useTranslationsForNestedValidation } from '../../core';

export const AIdentityProviderOAuth2ClientFields = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Partial<OAuth2IdentityProvider>>,
        },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            client_id: '',
            client_secret: '',
        });

        const $v = useVuelidate({
            client_id: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
            client_secret: {
                minLength: minLength(3),
                maxLength: maxLength(128),
            },
        }, form, {
            $registerAs: 'client',
        });

        function assign() {
            assignFormProperties(form, props.entity);
        }

        const updatedAt = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updatedAt, () => assign());

        assign();

        const validationMessages = useTranslationsForNestedValidation($v.value);

        return () => [
            buildFormGroup({
                validationMessages: validationMessages.client_id.value,
                validationSeverity: getVuelidateSeverity($v.value.client_id),
                label: true,
                labelContent: 'Client ID',
                content: buildFormInput({
                    value: $v.value.client_id.$model,
                    onChange(input) {
                        $v.value.client_id.$model = input;
                    },
                }),
            }),
            buildFormGroup({
                validationMessages: validationMessages.client_secret.value,
                validationSeverity: getVuelidateSeverity($v.value.client_secret),
                label: true,
                labelContent: 'Client Secret',
                content: buildFormInput({
                    value: $v.value.client_secret.$model,
                    onChange(input) {
                        $v.value.client_secret.$model = input;
                    },
                }),
            }),
        ];
    },
});
