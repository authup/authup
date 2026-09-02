/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { MergeProvisioningOptions, MergeableProvisioningEntity } from './types.ts';

export function buildProvisioningEntityKey(
    attributes: MergeableProvisioningEntity['attributes'],
): string | undefined {
    if (!attributes.name) return undefined;
    return `${attributes.name}:${attributes.realmId || ''}:${attributes.clientId || ''}`;
}

export function mergeProvisioningEntities<T extends MergeableProvisioningEntity>(
    target: T[] | undefined,
    source: T[] | undefined,
    options: MergeProvisioningOptions = {},
): T[] | undefined {
    if (!source) return target;
    if (!target) return [...source];

    const result = [...target];
    source.forEach((item) => {
        const key = buildProvisioningEntityKey(item.attributes);
        if (!key) {
            result.push(item);
            return;
        }

        const idx = result.findIndex((r) => buildProvisioningEntityKey(r.attributes) === key);
        if (idx !== -1) {
            result[idx] = mergeProvisioningEntity(result[idx], item, options) as T;
        } else {
            result.push(item);
        }
    });
    return result;
}

/**
 * Deep-merge two entries sharing a composite key. The later (source) side
 * wins per attribute, but relations are UNIONED — a later source (e.g. a
 * mounted provisioning file) extending a built-in entry (the default
 * source's master realm) must not silently drop the built-in relations
 * (admin user, system client).
 *
 * Policy extraAttributes merge per key with the later source winning —
 * like attributes, NOT like relations: an EA value (a names denylist,
 * an ATTRIBUTES query tree) is policy configuration, and unioning would
 * make shrinking a list impossible and fabricate predicates neither
 * source authored.
 */
export function mergeProvisioningEntity(
    target: MergeableProvisioningEntity,
    source: MergeableProvisioningEntity,
    options: MergeProvisioningOptions = {},
): MergeableProvisioningEntity {
    const output = { ...target, ...source };

    output.attributes = { ...target.attributes, ...source.attributes };

    const inheritStrategy = options.inheritStrategy ?? true;
    if (target.strategy && !source.strategy) {
        if (inheritStrategy) {
            output.strategy = target.strategy;
        } else {
            delete output.strategy;
        }
    }

    if (target.relations && source.relations) {
        output.relations = mergeProvisioningRecord(target.relations, source.relations, options);
    } else if (target.relations && !source.relations) {
        output.relations = target.relations;
    }

    if (target.extraAttributes && source.extraAttributes) {
        output.extraAttributes = { ...target.extraAttributes, ...source.extraAttributes };
    } else if (target.extraAttributes && !source.extraAttributes) {
        output.extraAttributes = target.extraAttributes;
    }

    if (target.children && source.children) {
        output.children = mergeProvisioningEntities(target.children, source.children, options);
    } else if (target.children && !source.children) {
        output.children = target.children;
    }

    return output;
}

function mergeProvisioningRecord(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    options: MergeProvisioningOptions = {},
): Record<string, unknown> {
    const output : Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(source)) {
        output[key] = key in target ?
            mergeProvisioningValue(target[key], value, options) :
            value;
    }
    return output;
}

function mergeProvisioningValue(
    target: unknown,
    source: unknown,
    options: MergeProvisioningOptions = {},
): unknown {
    if (typeof target === 'undefined') return source;
    if (typeof source === 'undefined') return target;

    if (Array.isArray(target) && Array.isArray(source)) {
        if (isProvisioningEntityArray(target) || isProvisioningEntityArray(source)) {
            return mergeProvisioningEntities(
                target as MergeableProvisioningEntity[],
                source as MergeableProvisioningEntity[],
                options,
            );
        }
        return [...new Set([...target, ...source])];
    }

    if (isObject(target) && isObject(source)) {
        return mergeProvisioningRecord(target, source, options);
    }

    return source;
}

function isProvisioningEntityArray(value: unknown[]): value is MergeableProvisioningEntity[] {
    return value.some(
        (item) => isObject(item) && 'attributes' in item,
    );
}
