/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/kit';
import type { Slot, Slots, VNode } from 'vue';

/**
 * Slot-name vocabulary previously exported by `@vuecs/list-controls`.
 * `@vuecs/list` 1.0 (plan 027 compound rewrite) removed the enum;
 * authup keeps the string literals locally so existing collection
 * components and the `EntityCollectionSlotName` re-export keep
 * compiling. New code should prefer the compound `<VCList*>` parts
 * over slot-name dispatch.
 */
export enum SlotName {
    DEFAULT = 'default',
    FOOTER = 'footer',
    HEADER = 'header',
    BODY = 'body',
    LOADING = 'loading',
    NO_MORE = 'noMore',
    ITEM = 'item',
    ITEM_ACTIONS = 'itemActions',
    ITEM_ACTIONS_EXTRA = 'itemActionsExtra',
}

/**
 * Returns true if either scoped or unscoped named slot exists
 *
 * @returns boolean
 *
 * @param name
 * @param $slots
 */
export function hasNormalizedSlot(
    name : string,
    $slots : Slots = {},
) {
    return hasOwnProperty($slots, name);
}

/**
 * Returns VNodes for named slot either scoped or unscoped
 *
 * @param name
 * @param scope
 * @param $slots
 *
 * @returns {Array} VNodes
 */
export function normalizeSlot(
    name : string,
    scope: Record<string, any> = {},
    $slots : Slots = {},
) : VNode[] | VNode {
    if (hasOwnProperty($slots, name)) {
        return ($slots[name] as Slot)(scope);
    }

    return [];
}
