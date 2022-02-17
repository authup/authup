/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CreateElement } from 'vue';
import { ComponentListData, ComponentListMethods, ComponentListProperties } from '../type';

export function buildListSearch<T extends Record<string, any>>(
    instance: ComponentListMethods<T> &
    ComponentListData<T> &
    ComponentListProperties<T> & {
        $scopedSlots: Record<string, any>,
        $slots: Record<string, any>
    },
    h: CreateElement,
) {
    let search = h();
    if (instance.withSearch) {
        search = h('div', { staticClass: 'list-search' }, [
            h('div', { staticClass: 'form-group' }, [
                h('div', { staticClass: 'input-group' }, [
                    h('input', {
                        directives: [{
                            name: 'model',
                            value: instance.q,
                        }],
                        staticClass: 'form-control',
                        attrs: {
                            type: 'text',
                            placeholder: '...',
                        },
                        domProps: {
                            value: instance.q,
                        },
                        on: {
                            input($event: any) {
                                if ($event.target.composing) {
                                    return;
                                }

                                instance.q = $event.target.value;
                            },
                        },
                    }),
                ]),
            ]),
        ]);
    }

    return search;
}
