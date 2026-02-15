/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import type { PermissionProvisioningContainer } from '../../entities/permission';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { PermissionProvisioningSynchronizerContext } from './types.ts';

export class PermissionProvisioningSynchronizer extends BaseProvisioningSynchronizer<PermissionProvisioningContainer> {
    protected repository : Repository<Permission>;

    constructor(ctx: PermissionProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
    }

    async synchronize(input: PermissionProvisioningContainer): Promise<PermissionProvisioningContainer> {
        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || IsNull(),
            client_id: input.attributes.client_id || IsNull(),
        });
        if (!attributes) {
            attributes = await this.repository.save(input.attributes);
        }

        return {
            ...input,
            attributes,
        };
    }
}
