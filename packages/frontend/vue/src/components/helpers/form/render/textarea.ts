/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CreateElement, VNode } from 'vue';
import {
    ComponentFormComputed, ComponentFormData,
    ComponentFormMethods, ComponentFormVuelidate,
} from '../type';
import { FormGroup, FormGroupSlotScope } from '../../../core';

export type FormTextareaBuildContext<T extends Record<string, any>> = {
    title: string | VNode | (VNode | string)[],
    propName: keyof T | string,
    textareaAttrs?: Record<string, any>
};

export function buildFormTextarea<T extends Record<string, any>>(
    instance: ComponentFormMethods<T> &
    ComponentFormComputed<T> &
    ComponentFormData<T> &
    ComponentFormVuelidate<T>,
    h: CreateElement,
    context: FormTextareaBuildContext<T>,
) : VNode {
    return h(FormGroup, {
        props: {
            validations: instance.$v.form[context.propName],
        },
        scopedSlots: {
            default: (props: FormGroupSlotScope) => h(
                'div',
                {
                    staticClass: 'form-group',
                    class: {
                        'form-group-error': instance.$v.form[context.propName].$error,
                        'form-group-warning': instance.$v.form[context.propName].$invalid && !instance.$v.form[context.propName].$dirty,
                    },
                },
                [
                    h('label', Array.isArray(context.title) ? context.title : [context.title]),
                    h('textarea', {
                        attrs: {
                            placeholder: '...',
                            ...(context.textareaAttrs || {}),
                        },
                        domProps: {
                            value: instance.$v.form[context.propName].$model,
                        },
                        staticClass: 'form-control',
                        on: {
                            input($event: any) {
                                if ($event.target.composing) {
                                    return;
                                }

                                instance.$set(instance.$v.form[context.propName], '$model', $event.target.value);
                            },
                        },
                    }),
                    props.errors.map((error) => h('div', {
                        staticClass: 'form-group-hint group-required',
                    }, [error])),
                ],
            ),
        },
    });
}
