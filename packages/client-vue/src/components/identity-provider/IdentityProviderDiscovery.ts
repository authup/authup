/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIClient, isOAuth2OpenIDProviderMetadata } from '@authup/core';
import { buildFormInput } from '@vue-layout/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    url,
} from '@vuelidate/validators';
import type { VNodeChild } from 'vue';
import {
    defineComponent, h, reactive, ref,
} from 'vue';
import { useValidationTranslator } from '../../translator';

export const IdentityProviderDiscovery = defineComponent({
    props: {
        translatorLocale: {
            type: String,
            default: undefined,
        },
    },
    emits: ['lookup', 'failed'],
    setup(props, setup) {
        const busy = ref(false);
        const form = reactive({
            url: '',
        });

        const $v = useVuelidate({
            url: {
                url,
            },
        }, form);

        const lookupValid = ref(false);

        const message = ref<string | null>(null);

        const apiClient = new APIClient();

        const lookup = async () => {
            if (busy.value || $v.value.url.$invalid) {
                return;
            }

            try {
                const response = await apiClient.get(form.url);
                if (isOAuth2OpenIDProviderMetadata(response.data)) {
                    setup.emit('lookup', response.data);
                    lookupValid.value = true;
                }
            } catch (e) {
                lookupValid.value = false;

                if (e instanceof Error) {
                    message.value = `Lookup failed with: ${e.message}`;
                    setup.emit('failed', e);
                }
            } finally {
                busy.value = false;
            }
        };

        return () => {
            let messageNode : VNodeChild;
            if (message.value) {
                messageNode = h('div', {
                    class: 'alert alert-sm alert-warning',
                }, message.value);
            }

            return [
                buildFormInput({
                    class: {
                        'is-valid': lookupValid.value,
                    },
                    validationResult: $v.value.url,
                    validationTranslator: useValidationTranslator(props.translatorLocale),
                    labelContent: 'Discovery',
                    props: {
                        placeholder: 'https://example.com/.well-known/openid-configuration',
                    },
                    value: form.url,
                    onChange(input) {
                        form.url = input;
                    },
                }),
                messageNode,
                h('button', {
                    type: 'button',
                    class: 'btn btn-xs btn-primary mb-1',
                    disabled: !form.url || $v.value.$invalid,
                    onClick($event: any) {
                        $event.preventDefault();

                        return lookup();
                    },
                }, [
                    h('i', { class: 'fa fa-search pe-1' }),
                    'Lookup',
                ]),
            ];
        };
    },
});
