/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Returns true if either scoped or unscoped named slot exists
 *
 * @returns {Array|undefined} VNodes
 *
 * @param names
 * @param $scopedSlots
 * @param $slots
 */
export function hasNormalizedSlot(
    names : string[] | string,
    $scopedSlots : Record<string, any> = {},
    $slots : Record<string, any> = {},
) {
    names = Array.isArray(names) ? names : [names];
    // Ensure names is an array
    names = names.filter((name) => name);
    // Returns true if the either a $scopedSlot or $slot exists with the specified name
    return names.some((name) => $scopedSlots[name] || $slots[name]);
}

/**
 * Returns VNodes for named slot either scoped or unscoped
 *
 * @param names
 * @param {String} scope
 * @param $scopedSlots
 * @param $slots
 *
 * @returns {Array|undefined} VNodes
 */
export function normalizeSlot(
    names : string[] | string,
    scope: Record<string, any> = {},
    $scopedSlots : Record<string, any> = {},
    $slots : Record<string, any> = {},
) {
    // Ensure names is an array
    names = Array.isArray(names) ? names : [names];
    // Ensure names is an array
    names = names.filter((name) => name);

    let slot;

    for (let i = 0; i < names.length && !slot; i++) {
        const name = names[i];
        slot = $scopedSlots[name] || $slots[name];
    }
    // Note: in Vue 2.6.x, all named slots are also scoped slots
    return typeof slot === 'function' ? slot(scope) : slot;
}
