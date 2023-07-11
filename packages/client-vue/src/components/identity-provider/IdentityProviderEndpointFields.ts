/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, OAuth2IdentityProvider, OAuth2OpenIDProviderMetadata } from '@authup/core';
import { buildFormInput } from '@vue-layout/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    required, url,
} from '@vuelidate/validators';
import type { PropType, VNodeChild } from 'vue';
import {
    defineComponent, h, reactive,
} from 'vue';
import { onChange, useUpdatedAt } from '../../composables';
import { extendObjectProperties } from '../../core';
import { useValidationTranslator } from '../../translator';
import { IdentityProviderDiscovery } from './IdentityProviderDiscovery';

export const IdentityProviderEndpointFields = defineComponent({
    name: 'IdentityProviderEndpointFields',
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
    setup(props, setup) {
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
            extendObjectProperties(form, props.entity);
        }

        const updated = useUpdatedAt(props.entity as IdentityProvider);
        onChange(updated, () => init());

        init();

        return () => {
            let discoveryNode : VNodeChild;

            if (props.discovery) {
                discoveryNode = [
                    h(IdentityProviderDiscovery, {
                        onLookup(data: OAuth2OpenIDProviderMetadata) {
                            form.authorize_url = data.authorization_endpoint;
                            form.token_url = data.token_endpoint;
                        },
                    }),
                ];
            }

            return [
                discoveryNode,
                buildFormInput({
                    validationResult: $v.value.token_url,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'Token',
                    value: form.token_url,
                    onChange(input) {
                        form.token_url = input;
                    },
                    props: {
                        placeholder: 'https://...',
                    },
                }),
                buildFormInput({
                    validationResult: $v.value.authorize_url,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'Authorize',
                    value: form.authorize_url,
                    onChange(input) {
                        form.authorize_url = input;
                    },
                    props: {
                        placeholder: 'https://...',
                    },
                }),
                buildFormInput({
                    validationResult: $v.value.user_info_url,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'UserInfo',
                    value: form.user_info_url,
                    onChange(input) {
                        form.user_info_url = input;
                    },
                    props: {
                        placeholder: 'https://...',
                    },
                }),
            ];
        };
    },
});
