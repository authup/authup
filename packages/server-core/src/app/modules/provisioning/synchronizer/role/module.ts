/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission, Role, RolePermission,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { In, IsNull } from 'typeorm';
import type { RoleProvisioningContainer } from '../../entities/role';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RoleProvisioningSynchronizerContext } from './types.ts';

export class RoleProvisioningSynchronizer extends BaseProvisioningSynchronizer<RoleProvisioningContainer> {
    protected repository : Repository<Role>;

    protected permissionRepository : Repository<Permission>;

    protected rolePermissionRepository: Repository<RolePermission>;

    constructor(ctx: RoleProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
        this.rolePermissionRepository = ctx.rolePermissionRepository;
    }

    async synchronize(input: RoleProvisioningContainer): Promise<RoleProvisioningContainer> {
        let data = await this.repository.findOneBy({
            name: input.data.name,
            realm_id: input.data.realm_id || IsNull(),
            client_id: input.data.client_id || IsNull(),
        });
        if (!data) {
            data = await this.repository.save(input.data);
        }

        if (input.relations && input.relations.globalPermissions) {
            let permissions : Permission[];

            const hasWildcard = input.relations.globalPermissions.some((el) => el === '*');
            if (hasWildcard) {
                permissions = await this.permissionRepository.findBy({
                    realm_id: IsNull(),
                    client_id: IsNull(),
                });
            } else {
                permissions = await this.permissionRepository.findBy({
                    name: In(input.relations.globalPermissions),
                    realm_id: IsNull(),
                    client_id: IsNull(),
                });
            }

            for (let i = 0; i < permissions.length; i++) {
                const permission = permissions[i];

                let rolePermission = await this.rolePermissionRepository.findOneBy({
                    role_id: data.id,
                    permission_id: permission.id,
                });

                if (!rolePermission) {
                    rolePermission = this.rolePermissionRepository.create({
                        role_id: data.id,
                        role_realm_id: data.realm_id,
                        permission_id: permission.id,
                        permission_realm_id: permission.realm_id,
                    });

                    await this.rolePermissionRepository.save(rolePermission);
                }
            }
        }

        return {
            ...input,
            data,
        };
    }
}
