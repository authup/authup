/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { RootProvisioningEntity } from '../../../../../core/provisioning/entities/root/index.ts';
import type { IProvisioningSource } from '../../../../../core/provisioning/types.ts';
import type { IContainer } from 'eldin';

/**
 * Structural view of a provisioning entity used by the composite merge.
 * Covers every entity shape (realm, client, user, role, permission, scope,
 * policy): the composite-key attribute bag plus the deep-mergeable groups.
 */
type MergeableProvisioningEntity = {
    attributes: {
        name?: string,
        realmId?: string | null,
        clientId?: string | null,
    },
    strategy?: unknown,
    relations?: Record<string, unknown>,
    children?: MergeableProvisioningEntity[],
    extraAttributes?: Record<string, unknown>,
};

export class CompositeProvisioningSource implements IProvisioningSource {
    protected sources : IProvisioningSource[];

    constructor(sources : IProvisioningSource[]) {
        this.sources = sources;
    }

    async load(container: IContainer): Promise<RootProvisioningEntity> {
        const output : RootProvisioningEntity = {};

        const sourcesData = await Promise.all(
            (this.sources).map((source) => source.load(container)),
        );

        sourcesData.map((sourceData) => this.merge(output, sourceData));

        return output;
    }

    merge(target: RootProvisioningEntity, source: RootProvisioningEntity) {
        target.policies = this.mergeEntities(target.policies, source.policies);
        target.permissions = this.mergeEntities(target.permissions, source.permissions);
        target.roles = this.mergeEntities(target.roles, source.roles);
        target.scopes = this.mergeEntities(target.scopes, source.scopes);
        target.realms = this.mergeEntities(target.realms, source.realms);
    }

    private buildEntityKey(
        attributes: MergeableProvisioningEntity['attributes'],
    ): string | undefined {
        if (!attributes.name) return undefined;
        return `${attributes.name}:${attributes.realmId || ''}:${attributes.clientId || ''}`;
    }

    private mergeEntities<T extends MergeableProvisioningEntity>(
        target: T[] | undefined,
        source: T[] | undefined,
    ): T[] | undefined {
        if (!source) return target;
        if (!target) return [...source];

        const result = [...target];
        source.forEach((item) => {
            const key = this.buildEntityKey(item.attributes);
            if (!key) {
                result.push(item);
                return;
            }

            const idx = result.findIndex((r) => this.buildEntityKey(r.attributes) === key);
            if (idx !== -1) {
                result[idx] = this.mergeEntity(result[idx], item) as T;
            } else {
                result.push(item);
            }
        });
        return result;
    }

    /**
     * Deep-merge two entries sharing a composite key. The later source wins
     * per attribute, but relations are UNIONED — a later source (e.g. a
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
    private mergeEntity(
        target: MergeableProvisioningEntity,
        source: MergeableProvisioningEntity,
    ): MergeableProvisioningEntity {
        const output = { ...target, ...source };

        output.attributes = { ...target.attributes, ...source.attributes };

        if (target.strategy && !source.strategy) {
            output.strategy = target.strategy;
        }

        if (target.relations && source.relations) {
            output.relations = this.mergeRecord(target.relations, source.relations);
        } else if (target.relations && !source.relations) {
            output.relations = target.relations;
        }

        if (target.extraAttributes && source.extraAttributes) {
            output.extraAttributes = { ...target.extraAttributes, ...source.extraAttributes };
        } else if (target.extraAttributes && !source.extraAttributes) {
            output.extraAttributes = target.extraAttributes;
        }

        if (target.children && source.children) {
            output.children = this.mergeEntities(target.children, source.children);
        } else if (target.children && !source.children) {
            output.children = target.children;
        }

        return output;
    }

    private mergeRecord(
        target: Record<string, unknown>,
        source: Record<string, unknown>,
    ): Record<string, unknown> {
        const output : Record<string, unknown> = { ...target };
        for (const key of Object.keys(source)) {
            output[key] = key in target ?
                this.mergeValue(target[key], source[key]) :
                source[key];
        }
        return output;
    }

    private mergeValue(target: unknown, source: unknown): unknown {
        if (typeof target === 'undefined') return source;
        if (typeof source === 'undefined') return target;

        if (Array.isArray(target) && Array.isArray(source)) {
            if (this.isEntityArray(target) || this.isEntityArray(source)) {
                return this.mergeEntities(
                    target as MergeableProvisioningEntity[],
                    source as MergeableProvisioningEntity[],
                );
            }
            return [...new Set([...target, ...source])];
        }

        if (isObject(target) && isObject(source)) {
            return this.mergeRecord(target, source);
        }

        return source;
    }

    private isEntityArray(value: unknown[]): value is MergeableProvisioningEntity[] {
        return value.some(
            (item) => isObject(item) && 'attributes' in item,
        );
    }
}
