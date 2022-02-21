/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CreateElement } from 'vue';
import { ComponentListData, ComponentListMethods, ComponentListProperties } from '../type';
import { Pagination } from '../../../core/Pagination';

export function buildListPagination<T extends Record<string, any>>(
    instance: ComponentListMethods<T> &
    ComponentListData<T> &
    ComponentListProperties<T> & {
        $scopedSlots: Record<string, any>,
        $slots: Record<string, any>
    },
    h: CreateElement,
) {
    let node = h();
    if (instance.withPagination) {
        node = h('div', { staticClass: 'list-pagination' }, [
            h(Pagination, {
                props: instance.meta,
                on: {
                    to: instance.goTo,
                },
            }),
        ]);
    }

    return node;
}
