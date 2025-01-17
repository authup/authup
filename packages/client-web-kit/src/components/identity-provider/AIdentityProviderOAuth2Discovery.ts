/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { isOpenIDProviderMetadata } from '@authup/security';
import { buildFormGroup, buildFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    url,
} from '@vuelidate/validators';
import type { VNodeChild } from 'vue';
import {
    defineComponent, h, reactive, ref,
} from 'vue';
import { getVuelidateSeverity, useTranslationsForBaseValidation } from '../../core';

export const AIdentityProviderOAuth2Discovery = defineComponent({
    emits: ['lookup', 'failed'],
    setup(_, setup) {
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

        const apiClient = new Client();

        const lookup = async () => {
            if (busy.value || $v.value.url.$invalid) {
                return;
            }

            try {
                const response = await apiClient.get(form.url);
                if (isOpenIDProviderMetadata(response.data)) {
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

        const validationMessages = useTranslationsForBaseValidation($v.value.url);

        return () => {
            let messageNode : VNodeChild;
            if (message.value) {
                messageNode = h('div', {
                    class: 'alert alert-sm alert-warning',
                }, message.value);
            }

            return [
                buildFormGroup({
                    validationMessages: validationMessages.value,
                    validationSeverity: getVuelidateSeverity($v.value.url),
                    labelContent: 'Discovery',
                    content: buildFormInput({
                        class: {
                            'is-valid': lookupValid.value,
                        },
                        props: {
                            placeholder: 'https://example.com/.well-known/openid-configuration',
                        },
                        value: $v.value.url.$model,
                        onChange(input) {
                            $v.value.url.$model = input;
                        },
                    }),
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
