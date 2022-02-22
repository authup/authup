/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CreateElement, VNode } from 'vue';
import { Realm } from '@typescript-auth/domains';
import {
    ComponentFormComputed, ComponentFormData, ComponentFormMethods, ComponentFormVuelidate, ComponentListData,
    FormGroup, FormGroupSlotScope,
} from '../../../helpers';
import { RealmList } from '../RealmList';
import { SlotName } from '../../../constants';

export type RealmSelectListBuildContext<T extends Record<string, any>> = {
    propName: keyof T | string,
    value?: string
};

export function buildRealmSelectForm<T extends Record<string, any>>(
    instance: ComponentFormMethods<T> &
    ComponentFormComputed<T> &
    ComponentFormData<T> &
    ComponentFormVuelidate<T>,
    h: CreateElement,
    context: RealmSelectListBuildContext<T>,
) : VNode {
    return h(FormGroup, {
        props: {
            validations: instance.$v.form[context.propName],
        },
        scopedSlots: {
            default: (props: FormGroupSlotScope) => h('div', {
                staticClass: 'form-group',
                class: {
                    'form-group-error': instance.$v.form[context.propName].$error,
                    'form-group-warning': instance.$v.form[context.propName].$invalid &&
                        !instance.$v.form[context.propName].$dirty,
                },
            }, [
                h('label', ['Realm']),
                h(RealmList, {
                    props: {
                        withSearch: false,
                        withHeader: false,
                        withPagination: false,
                        withNoMore: false,
                    },
                    scopedSlots: {
                        [SlotName.ITEMS]: (propsItemsSlot: Partial<ComponentListData<Realm>>) => h(
                            'select',
                            {
                                staticClass: 'form-control',
                                attrs: {
                                    disabled: propsItemsSlot.busy,
                                },
                                domProps: {
                                    ...(context.value ? { value: context.value } : {}),
                                },
                                on: {
                                    change($event: any) {
                                        const $$selectedVal = Array.prototype.filter.call($event.target.options, (o) => o.selected).map((o) => ('_value' in o ? o._value : o.value));

                                        instance.$set(
                                            instance.$v.form[context.propName],
                                            '$model',
                                            $event.target.multiple ? $$selectedVal : $$selectedVal[0],
                                        );
                                    },
                                },
                            },
                            [
                                h('option', {
                                    domProps: { value: '' },
                                }, ['-- Select option --']),
                                propsItemsSlot.items?.map((item: Realm) => h('option', {
                                    key: item.id,
                                    domProps: {
                                        value: item.id,
                                    },
                                }, [item.name])),
                            ],
                        ),
                    },
                }),
                props.errors.map((error) => h('div', {
                    staticClass: 'form-group-hint group-required',
                }, [error])),
            ]),
        },
    });
}
