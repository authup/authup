/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, OAuth2IdentityProvider, OAuth2OpenIDProviderMetadata } from '@authup/core';
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
import { extendObjectProperties, useValidationTranslator } from '../../core';
import { AIdentityProviderDiscovery } from './AIdentityProviderDiscovery';

export const AIdentityProviderEndpointFields = defineComponent({
    props: {
        entity: {
            type: Object as PropType<Partial<OAuth2IdentityProvider>>,
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

        return () => {
            let discoveryNode : VNodeChild;

            if (props.discovery) {
                discoveryNode = [
                    h(AIdentityProviderDiscovery, {
                        onLookup(data: OAuth2OpenIDProviderMetadata) {
                            form.authorize_url = data.authorization_endpoint;
                            form.token_url = data.token_endpoint;
                        },
                    }),
                ];
            }

            return [
                discoveryNode,
                buildFormGroup({
                    validationResult: $v.value.token_url,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    label: true,
                    labelContent: 'Token',
                    content: buildFormInput({
                        value: form.token_url,
                        onChange(input) {
                            form.token_url = input;
                        },
                        props: {
                            placeholder: 'https://...',
                        },
                    }),
                }),
                buildFormGroup({
                    validationResult: $v.value.authorize_url,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    label: true,
                    labelContent: 'Authorize',
                    content: buildFormInput({
                        value: form.authorize_url,
                        onChange(input) {
                            form.authorize_url = input;
                        },
                        props: {
                            placeholder: 'https://...',
                        },
                    }),
                }),
                buildFormGroup({
                    validationResult: $v.value.user_info_url,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    label: true,
                    labelContent: 'UserInfo',
                    content: buildFormInput({
                        value: form.user_info_url,
                        onChange(input) {
                            form.user_info_url = input;
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
