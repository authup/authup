/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CreateElement, VNode } from 'vue';
import { ComponentListData, ComponentListMethods, ComponentListProperties } from '../type';
import { hasNormalizedSlot, normalizeSlot } from '../../../utils/normalize-slot';
import { SlotName } from '../../../constants';

export type ListItemsBuildContext = {
    itemIconClass?: string,
    itemTextPropName?: string
};

export function buildListItems<T extends Record<string, any>>(
    instance: ComponentListMethods<T> &
    ComponentListData<T> &
    ComponentListProperties<T> & {
        $scopedSlots: Record<string, any>,
        $slots: Record<string, any>
    },
    h: CreateElement,
    context?: ListItemsBuildContext,
) : VNode {
    const $scopedSlots = instance.$scopedSlots || {};
    const $slots = instance.$slots || {};

    context = context || {};
    context.itemIconClass = context.itemIconClass || 'fa fa-bars';
    context.itemTextPropName = context.itemTextPropName || 'name';

    const hasItemSlot = hasNormalizedSlot(SlotName.ITEM, $scopedSlots, $slots);
    const itemFn = (item: T) => h('div', {
        key: item.id,
        staticClass: 'list-item',
    }, [
        h('div', [h('i', { staticClass: context?.itemIconClass })]),
        h('div', [context?.itemTextPropName ? item[context?.itemTextPropName] : '???']),
        h('div', { staticClass: 'ml-auto' }, [
            hasNormalizedSlot(SlotName.ITEM_ACTIONS, $scopedSlots, $slots) ?
                normalizeSlot(SlotName.ITEM_ACTIONS, { item }, $scopedSlots, $slots) :
                '',
        ]),
    ]);

    // ----------------------------------------------------------------------
    const itemsAlt = instance.items.map((item: T) => (hasItemSlot ?
        normalizeSlot(SlotName.ITEM, {
            itemBusy: instance.itemBusy,
            item,
            busy: instance.busy,
            drop: instance.drop,
        }, $scopedSlots, $slots) :
        itemFn(item)));

    const hasItemsSlot = hasNormalizedSlot(SlotName.ITEMS, $scopedSlots, $slots);
    return h(
        'div',
        { staticClass: 'list-items' },
        [hasItemsSlot ?
            normalizeSlot(SlotName.ITEMS, {
                items: instance.items,
                busy: instance.busy,
            }, $scopedSlots, $slots) :
            itemsAlt,
        ],
    );
}
