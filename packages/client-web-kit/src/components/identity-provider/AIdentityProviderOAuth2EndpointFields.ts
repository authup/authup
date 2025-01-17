/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, OAuth2IdentityProvider } from '@authup/core-kit';
import type { OpenIDProviderMetadata } from '@authup/specs';
import { buildFormGroup, buildFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    required, url,
} from '@vuelidate/validators';
import type { PropType, VNodeChild } from 'vue';
import {
    defineComponent, h, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { extendObjectProperties, getVuelidateSeverity, useTranslationsForNestedValidation } from '../../core';
import { AIdentityProviderOAuth2Discovery } from './AIdentityProviderOAuth2Discovery';

export const AIdentityProviderOAuth2EndpointFields = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Partial<OAuth2IdentityProvider>>,
        },
        discovery: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['updated'],
    setup(props) {
        const form = reactive({
            token_url: '',
            authorize_url: '',
            user_info_url: '',
        });

        const $v = useVuelidate({
            token_url: {
                required,
                url,
            },
            authorize_url: {
                required,
                url,
            },
            user_info_url: {
                url,
            },
        }, form, {
            $registerAs: 'endpoint',
        });

        function init() {
            if (!props.entity) return;

            extendObjectProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        const validationMessages = useTranslationsForNestedValidation($v.value);

        return () => {
            let discoveryNode : VNodeChild;

            if (props.discovery) {
                discoveryNode = [
                    h(AIdentityProviderOAuth2Discovery, {
                        onLookup(data: OpenIDProviderMetadata) {
                            form.authorize_url = data.authorization_endpoint;
                            form.token_url = data.token_endpoint;
                        },
                    }),
                ];
            }

            return [
                discoveryNode,
                buildFormGroup({
                    validationMessages: validationMessages.token_url.value,
                    validationSeverity: getVuelidateSeverity($v.value.token_url),
                    label: true,
                    labelContent: 'Token',
                    content: buildFormInput({
                        value: $v.value.token_url.$model,
                        onChange(input) {
                            $v.value.token_url.$model = input;
                        },
                        props: {
                            placeholder: 'https://...',
                        },
                    }),
                }),
                buildFormGroup({
                    validationMessages: validationMessages.authorize_url.value,
                    validationSeverity: getVuelidateSeverity($v.value.authorize_url),
                    label: true,
                    labelContent: 'Authorize',
                    content: buildFormInput({
                        value: $v.value.authorize_url.$model,
                        onChange(input) {
                            $v.value.authorize_url.$model = input;
                        },
                        props: {
                            placeholder: 'https://...',
                        },
                    }),
                }),
                buildFormGroup({
                    validationMessages: validationMessages.user_info_url.value,
                    validationSeverity: getVuelidateSeverity($v.value.user_info_url),
                    label: true,
                    labelContent: 'UserInfo',
                    content: buildFormInput({
                        value: $v.value.user_info_url.$model,
                        onChange(input) {
                            $v.value.user_info_url.$model = input;
                        },
                        props: {
                            placeholder: 'https://...',
                        },
                    }),
                }),
            ];
        };
    },
});
