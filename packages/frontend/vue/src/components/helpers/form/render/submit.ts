/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CreateElement } from 'vue';
import {
    ComponentFormComputed, ComponentFormData,
    ComponentFormMethods, ComponentFormVuelidate,
} from '../type';

export function buildFormSubmit<T extends Record<string, any>>(
    instance: ComponentFormMethods<T> &
    ComponentFormComputed<T> &
    ComponentFormData<T> &
    ComponentFormVuelidate<T>,
    h: CreateElement,
) {
    return h('div', {
        staticClass: 'form-group',
    }, [
        h('button', {
            staticClass: 'btn btn-xs',
            class: {
                'btn-primary': instance.isEditing,
                'btn-success': !instance.isEditing,
            },
            domProps: {
                disabled: instance.$v.form.$invalid || instance.busy,
            },
            attrs: {
                disabled: instance.$v.form.$invalid || instance.busy,
                type: 'button',
            },
            on: {
                click($event: any) {
                    $event.preventDefault();

                    return instance.submit.apply(null);
                },
            },
        }, [
            h('i', {
                class: {
                    'fa fa-save': instance.isEditing,
                    'fa fa-plus': !instance.isEditing,
                },
            }),
            ' ',
            (instance.isEditing ? 'Update' : 'Create'),
        ]),
    ]);
}
