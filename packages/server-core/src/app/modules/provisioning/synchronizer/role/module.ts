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
import type { RoleProvisioningData } from '../../entities/role/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RoleProvisioningSynchronizerContext } from './types.ts';

export class RoleProvisioningSynchronizer extends BaseProvisioningSynchronizer<RoleProvisioningData> {
    protected repository : Repository<Role>;

    protected permissionRepository : Repository<Permission>;

    protected rolePermissionRepository: Repository<RolePermission>;

    constructor(ctx: RoleProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
        this.rolePermissionRepository = ctx.rolePermissionRepository;
    }

    async synchronize(input: RoleProvisioningData): Promise<RoleProvisioningData> {
        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || IsNull(),
            client_id: input.attributes.client_id || IsNull(),
        });
        if (!attributes) {
            attributes = await this.repository.save(input.attributes);
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
                    role_id: attributes.id,
                    permission_id: permission.id,
                });

                if (!rolePermission) {
                    rolePermission = this.rolePermissionRepository.create({
                        role_id: attributes.id,
                        role_realm_id: attributes.realm_id,
                        permission_id: permission.id,
                        permission_realm_id: permission.realm_id,
                    });

                    await this.rolePermissionRepository.save(rolePermission);
                }
            }
        }

        return {
            ...input,
            attributes,
        };
    }
}
