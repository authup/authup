/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IProvisioningSource, ProvisioningData } from '../../types.ts';

export class CompositeProvisioningSource implements IProvisioningSource {
    protected sources : IProvisioningSource[];

    constructor(sources : IProvisioningSource[]) {
        this.sources = sources;
    }

    async load(): Promise<ProvisioningData> {
        const output : ProvisioningData = {
            roles: [],
            realms: [],
            permissions: [],
        };

        for (let i = 0; i < this.sources.length; i++) {
            const source = this.sources[i];

            const sourceData = await source.load();

            if (sourceData.roles) {
                // todo: unique check and merge
                output.roles = output.roles || [];
                output.roles.push(...sourceData.roles);
            }

            if (sourceData.realms) {
                // todo: unique check and merge
                output.realms = output.realms || [];
                output.realms.push(...sourceData.realms);
            }

            if (sourceData.permissions) {
                // todo: unique check and merge
                output.permissions = output.permissions || [];
                output.permissions.push(...sourceData.permissions);
            }

            if (sourceData.scopes) {
                // todo: unique check and merge
                output.scopes = output.scopes || [];
                output.scopes.push(...sourceData.scopes);
            }
        }

        return output;
    }
}
