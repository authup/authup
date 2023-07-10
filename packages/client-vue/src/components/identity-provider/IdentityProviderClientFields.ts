/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider } from '@authup/core';
import { buildFormInput } from '@vue-layout/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required, url,
} from '@vuelidate/validators';
import type { PropType } from 'vue';
import {
    computed, defineComponent, h, reactive, toRefs,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { extendObjectProperties } from '../../core';
import { useValidationTranslator } from '../../translator';

export const IdentityProviderClientFields = defineComponent({
    name: 'IdentityProviderClientForm',
    props: {
        entity: {
            type: Object as PropType<Partial<OAuth2IdentityProvider>>,
        },
        translatorLocale: {
            type: String,
        },
    },
    emits: ['updated'],
    setup(props, setup) {
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

        const update = () => {
            setup.emit('updated', {
                data: form,
                valid: !$v.value.$invalid,
            });
        };

        function assign() {
            extendObjectProperties(form, props.entity);
        }

        const updatedAt = useUpdatedAt(props.entity);
        onChange(updatedAt, () => assign());

        assign();

        return () => [
            buildFormInput({
                validationResult: $v.value.client_id,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Client ID',
                value: form.client_id,
                onChange(input) {
                    form.client_id = input;
                },
            }),
            buildFormInput({
                validationResult: $v.value.client_secret,
                validationTranslator: useValidationTranslator(props.translatorLocale),
                labelContent: 'Client Secret',
                value: form.client_secret,
                onChange(input) {
                    form.client_secret = input;
                },
            }),
        ];
    },
});
