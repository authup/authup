/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RootProvisioningEntity } from '../../../../../core/provisioning/entities/root/index.ts';
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
        attributes: {
            name?: string,
            realm_id?: string | null,
            client_id?: string | null
        },
    ): string | undefined {
        if (!attributes.name) return undefined;
        return `${attributes.name}:${attributes.realm_id || ''}:${attributes.client_id || ''}`;
    }

    private mergeEntities<
        T extends {
            attributes: {
                name?: string,
                realm_id?: string | null,
                client_id?: string | null
            }
        },
    >(
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
                result[idx] = item;
            } else {
                result.push(item);
            }
        });
        return result;
    }
}
