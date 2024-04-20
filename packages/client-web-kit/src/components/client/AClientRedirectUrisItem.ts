/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildFormGroup, buildFormInput } from '@vuecs/form-controls';
import useVuelidate from '@vuelidate/core';
import {
    maxLength, minLength, required,
} from '@vuelidate/validators';
import {
    defineComponent, h, nextTick, reactive,
} from 'vue';
import { useTranslationsForNestedValidation } from '../../core';

export const AClientRedirectUrisItem = defineComponent({
    props: {
        uri: {
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

        const validationMessages = useTranslationsForNestedValidation($v.value);

        const render = () => buildFormGroup({
            validationMessages: validationMessages.url.value,
            dirty: $v.value.url.$dirty,
            label: false,
            content: buildFormInput({
                value: $v.value.url.$model,
                onChange(input) {
                    $v.value.url.$model = input;

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
            }),
        });

        return () => render();
    },
});
