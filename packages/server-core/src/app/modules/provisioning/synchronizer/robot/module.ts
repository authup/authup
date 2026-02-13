/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, Permission, Robot, RobotPermission, RobotRole, Role,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { In, IsNull } from 'typeorm';
import type {
    RobotProvisioningContainer,
} from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RobotProvisioningSynchronizerContext } from './types.ts';

export class RobotProvisioningSynchronizer extends BaseProvisioningSynchronizer<RobotProvisioningContainer> {
    protected robotRepository: Repository<Robot>;

    protected robotRoleRepository: Repository<RobotRole>;

    protected robotPermissionRepository: Repository<RobotPermission>;

    protected roleRepository: Repository<Role>;

    protected permissionRepository: Repository<Permission>;

    protected clientRepository: Repository<Client>;

    constructor(ctx: RobotProvisioningSynchronizerContext) {
        super();

        this.robotRepository = ctx.robotRepository;
        this.robotRoleRepository = ctx.robotRoleRepository;
        this.robotPermissionRepository = ctx.robotPermissionRepository;
        this.roleRepository = ctx.roleRepository;
        this.permissionRepository = ctx.permissionRepository;
        this.clientRepository = ctx.clientRepository;
    }

    async synchronize(input: RobotProvisioningContainer): Promise<RobotProvisioningContainer> {
        const data = await this.robotRepository.save(input.data);

        // Permissions (Global, Realm & Client)
        const permissions : Permission[] = [];
        if (input.relations && input.relations.globalPermissions) {
            let entities : Permission[];

            const hasWildcard = input.relations.globalPermissions.some((el) => el === '*');
            if (hasWildcard) {
                entities = await this.permissionRepository.findBy({
                    realm_id: IsNull(),
                    client_id: IsNull(),
                });
            } else {
                entities = await this.permissionRepository.findBy({
                    name: In(input.relations.globalPermissions),
                    realm_id: IsNull(),
                    client_id: IsNull(),
                });
            }

            permissions.push(...entities);
        }

        if (input.relations && input.relations.realmPermissions) {
            let entities : Permission[];

            const hasWildcard = input.relations.realmPermissions.some((el) => el === '*');
            if (hasWildcard) {
                entities = await this.permissionRepository.findBy({
                    realm_id: data.realm_id,
                    client_id: IsNull(),
                });
            } else {
                entities = await this.permissionRepository.findBy({
                    name: In(input.relations.realmPermissions),
                    realm_id: data.realm_id,
                    client_id: IsNull(),
                });
            }

            permissions.push(...entities);
        }

        if (permissions.length > 0) {
            for (let i = 0; i < permissions.length; i++) {
                const permission = permissions[i];
                const rolePermission = this.robotPermissionRepository.create({
                    robot_id: data.id,
                    robot_realm_id: data.realm_id,
                    permission_id: permission.id,
                    permission_realm_id: permission.realm_id,
                });

                await this.robotPermissionRepository.save(rolePermission);
            }
        }

        // Role (Global & Realm)
        const roles : Role[] = [];
        if (input.relations && input.relations.globalRoles) {
            let entities : Role[];

            const hasWildcard = input.relations.globalRoles.some((el) => el === '*');
            if (hasWildcard) {
                entities = await this.roleRepository.findBy({
                    realm_id: IsNull(),
                    client_id: IsNull(),
                });
            } else {
                entities = await this.roleRepository.findBy({
                    name: In(input.relations.globalRoles),
                    realm_id: IsNull(),
                    client_id: IsNull(),
                });
            }

            roles.push(...entities);
        }

        if (input.relations && input.relations.realmRoles) {
            let entities : Role[];

            const hasWildcard = input.relations.realmRoles.some((el) => el === '*');
            if (hasWildcard) {
                entities = await this.roleRepository.findBy({
                    realm_id: data.realm_id,
                    client_id: IsNull(),
                });
            } else {
                entities = await this.roleRepository.findBy({
                    name: In(input.relations.realmRoles),
                    realm_id: data.realm_id,
                    client_id: IsNull(),
                });
            }

            roles.push(...entities);
        }

        if (roles.length > 0) {
            for (let i = 0; i < roles.length; i++) {
                const role = roles[i];
                const clientRole = this.robotRoleRepository.create({
                    robot_id: data.id,
                    robot_realm_id: data.realm_id,
                    role_id: role.id,
                    role_realm_id: role.realm_id,
                });

                await this.robotRoleRepository.save(clientRole);
            }
        }

        return {
            ...input,
            data,
        };
    }
}
