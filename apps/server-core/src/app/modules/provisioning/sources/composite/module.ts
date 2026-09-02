/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RootProvisioningEntity } from '../../../../../core/provisioning/entities/root/index.ts';
import { mergeProvisioningEntities } from '../../../../../core/provisioning/merge/index.ts';
import type { IProvisioningSource } from '../../../../../core/provisioning/types.ts';
import type { IContainer } from 'eldin';

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

        for (const sourceData of sourcesData) {
            this.merge(output, sourceData);
        }

        return output;
    }

    merge(target: RootProvisioningEntity, source: RootProvisioningEntity) {
        target.policies = mergeProvisioningEntities(target.policies, source.policies);
        target.permissions = mergeProvisioningEntities(target.permissions, source.permissions);
        target.roles = mergeProvisioningEntities(target.roles, source.roles);
        target.scopes = mergeProvisioningEntities(target.scopes, source.scopes);
        target.realms = mergeProvisioningEntities(target.realms, source.realms);
    }
}
