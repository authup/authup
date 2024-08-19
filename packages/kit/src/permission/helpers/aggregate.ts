/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionItem } from '../types';
import { mergePermissionItems } from './merge';

export function buildPermissionItemAggregationKey(entity: PermissionItem) {
    return `${entity.realm_id || '/'}:${entity.name}`;
}

export function aggregatePermissionItems(
    items: PermissionItem[],
): Record<string, PermissionItem> {
    const grouped: Record<string, PermissionItem[]> = {};
    for (let i = 0; i < items.length; i++) {
        const entity = items[i];
        const key = buildPermissionItemAggregationKey(entity);

        if (typeof grouped[key] === 'undefined') {
            grouped[key] = [];
        }

        grouped[key].push(entity);
    }

    const output: Record<string, PermissionItem> = {};
    const keys = Object.keys(grouped);
    for (let i = 0; i < keys.length; i++) {
        output[keys[i]] = mergePermissionItems(grouped[keys[i]]);
    }

    return output;
}
