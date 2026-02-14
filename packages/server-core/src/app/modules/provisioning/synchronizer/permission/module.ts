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
        let data = await this.repository.findOneBy({
            name: input.data.name,
            realm_id: input.data.realm_id || IsNull(),
            client_id: input.data.client_id || IsNull(),
        });
        if (!data) {
            data = await this.repository.save(input.data);
        }

        return {
            ...input,
            data,
        };
    }
}
