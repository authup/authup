/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Path } from '@authup/core-kit';
import { ensurePath } from '../../../entities/path/helpers.ts';
import type { IPathRepository } from '../../../entities/path/types.ts';
import type { PathProvisioningEntity } from '../../entities/path/types.ts';
import type { ProvisioningEntityStrategy } from '../../strategy/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { PathProvisioningSynchronizerContext } from './types.ts';

/**
 * The two columns a file may write. `path` is the address the folder is
 * looked up by, and `name` / `parentId` are derived from it, so neither is
 * ever taken from an entry.
 */
const WRITABLE_ATTRIBUTES = ['displayName', 'description'] as const;

export class PathProvisioningSynchronizer extends BaseProvisioningSynchronizer<PathProvisioningEntity> {
    protected repository : IPathRepository;

    constructor(ctx: PathProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
    }

    async synchronize(input: PathProvisioningEntity): Promise<PathProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);
        // a folder entry only exists nested in a realm, so the realm
        // synchronizer has stamped the key by the time this runs
        const realmId = input.attributes.realmId as string;
        const path = input.attributes.path.trim().toLowerCase();

        const existing = await this.repository.findOneBy({ realmId, path });

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (existing) {
                await this.repository.remove(existing);
            }

            return {
                ...input,
                attributes: existing ? { ...existing } : input.attributes,
            };
        }

        let entity = existing || await ensurePath(this.repository, realmId, path);

        const attributes = this.selectAttributes(input, strategy);
        const apply = !existing ||
            strategy.type === ProvisioningEntityStrategyType.MERGE ||
            strategy.type === ProvisioningEntityStrategyType.REPLACE;

        if (apply && Object.keys(attributes).length > 0) {
            entity = this.repository.merge(entity, attributes);
            entity = await this.repository.save(entity);
        }

        return {
            ...input,
            attributes: { ...entity },
        };
    }

    /**
     * The declared subset of the writable columns. A key the entry does not
     * carry is left out rather than written as `undefined`, so an entry
     * naming only the path never clears a folder's display name.
     */
    protected selectAttributes(
        input: PathProvisioningEntity,
        strategy: ProvisioningEntityStrategy<Path>,
    ): Partial<Path> {
        const selection = strategy.type === ProvisioningEntityStrategyType.MERGE ?
            strategy.attributes :
            undefined;

        const attributes : Partial<Path> = {};
        for (const key of WRITABLE_ATTRIBUTES) {
            if (typeof input.attributes[key] === 'undefined') {
                continue;
            }

            if (selection && !selection.includes(key)) {
                continue;
            }

            attributes[key] = input.attributes[key];
        }

        return attributes;
    }
}
