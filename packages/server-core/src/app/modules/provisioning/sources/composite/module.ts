/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RootProvisioningEntity } from '../../entities/root/index.ts';
import type { IProvisioningSource } from '../../types.ts';

export class CompositeProvisioningSource implements IProvisioningSource {
    protected sources : IProvisioningSource[];

    constructor(sources : IProvisioningSource[]) {
        this.sources = sources;
    }

    async load(): Promise<RootProvisioningEntity> {
        const output : RootProvisioningEntity = {
            roles: [],
            realms: [],
            permissions: [],
        };

        for (let i = 0; i < this.sources.length; i++) {
            const source = this.sources[i];

            const sourceData = await source.load();

            this.merge(output, sourceData);
        }

        return output;
    }

    merge(target: RootProvisioningEntity, source: RootProvisioningEntity) {
        if (source.roles) {
            // todo: unique check and merge
            target.roles = target.roles || [];
            target.roles.push(...source.roles);
        }

        if (source.realms) {
            // todo: unique check and merge
            target.realms = target.realms || [];
            target.realms.push(...source.realms);
        }

        if (source.permissions) {
            // todo: unique check and merge
            target.permissions = target.permissions || [];
            target.permissions.push(...source.permissions);
        }

        if (source.scopes) {
            // todo: unique check and merge
            target.scopes = target.scopes || [];
            target.scopes.push(...source.scopes);
        }
    }
}
