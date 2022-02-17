/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CreateElement } from 'vue';
import { hasNormalizedSlot, normalizeSlot } from '../../../utils/normalize-slot';
import { SlotName } from '../../../constants';
import { ComponentListData, ComponentListMethods, ComponentListProperties } from '../type';

export function buildListNoMore<T extends Record<string, any>>(
    instance: ComponentListMethods<T> &
    ComponentListData<T> &
    ComponentListProperties<T> & {
        $scopedSlots: Record<string, any>,
        $slots: Record<string, any>
    },
    h: CreateElement,
) {
    const $scopedSlots = instance.$scopedSlots || {};
    const $slots = instance.$slots || {};

    let node = h();
    if (!instance.busy && instance.items.length === 0) {
        const hasNoMoreSlot = hasNormalizedSlot(SlotName.ITEMS_NO_MORE, $scopedSlots, $slots);

        node = h('div', { staticClass: 'list-no-more' }, [
            hasNoMoreSlot ?
                normalizeSlot(SlotName.ITEMS_NO_MORE, {}, $scopedSlots, $slots) :
                h('div', { staticClass: 'alert alert-sm alert-info' }, [
                    'No (more) entries available.',
                ]),
        ]);
    }

    return node;
}
