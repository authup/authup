/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildFormInput } from '@vue-layout/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required, url,
} from '@vuelidate/validators';
import {
    defineComponent, h, nextTick, reactive,
} from 'vue';
import { useValidationTranslator } from '../../translator/utils';

export const ClientRedirectUriListItem = defineComponent({
    name: 'ClientRedirectUriListItem',
    props: {
        uri: {
            type: String,
            default: undefined,
        },
        translatorLocale: {
            type: String,
            default: undefined,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['updated', 'deleted'],
    setup(props, ctx) {
        const form = reactive({
            url: props.uri,
        });

        const $v = useVuelidate({
            url: {
                required,
                minLength: minLength(3),
                maxLength: maxLength(2000),
            },
        }, form);

        const render = () => buildFormInput({
            validationResult: $v.value.url,
            validationTranslator: useValidationTranslator(props.translatorLocale),
            label: false,
            value: form.url,
            onChange(input) {
                form.url = input;

                nextTick(() => {
                    ctx.emit('updated', input);
                });
            },
            groupAppend: true,
            groupAppendContent: h(
                'button',
                {
                    type: 'button',
                    class: 'btn btn-xs btn-danger',
                    onClick($event: any) {
                        $event.preventDefault();

                        ctx.emit('deleted');
                    },
                    disabled: props.disabled,
                },
                [
                    h('i', {
                        class: 'fa fa-minus',
                    }),
                ],
            ),
        });

        return () => render();
    },
});
