/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, ClientPermission, ClientRole, Permission, Role,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { In, IsNull } from 'typeorm';
import type { ClientProvisioningContainer } from '../../entities/client';
import type { PermissionProvisioningContainer } from '../../entities/permission';
import type { RoleProvisioningContainer } from '../../entities/role';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { ClientProvisioningSynchronizerContext } from './types.ts';

export class ClientProvisioningSynchronizer extends BaseProvisioningSynchronizer<ClientProvisioningContainer> {
    protected clientRepository: Repository<Client>;

    protected clientRoleRepository: Repository<ClientRole>;

    protected clientPermissionRepository: Repository<ClientPermission>;

    protected roleRepository: Repository<Role>;

    protected permissionRepository: Repository<Permission>;

    protected permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningContainer>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningContainer>;

    constructor(ctx: ClientProvisioningSynchronizerContext) {
        super();

        this.clientRepository = ctx.clientRepository;
        this.clientRoleRepository = ctx.clientRoleRepository;
        this.clientPermissionRepository = ctx.clientPermissionRepository;
        this.roleRepository = ctx.roleRepository;
        this.permissionRepository = ctx.permissionRepository;

        this.permissionSynchronizer = ctx.permissionSynchronizer;
        this.roleSynchronizer = ctx.roleSynchronizer;
    }

    async synchronize(input: ClientProvisioningContainer): Promise<ClientProvisioningContainer> {
        let data = await this.clientRepository.findOneBy({
            name: input.data.name,
            ...(input.data.realm_id ? { realm_id: input.data.realm_id } : { realm_id: IsNull() }),
        });
        if (!data) {
            data = await this.clientRepository.save(input.data);
        }

        // Permissions (Global + Realm)

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

                let clientPermission = await this.clientPermissionRepository.findOneBy({
                    client_id: data.id,
                    permission_id: permission.id,
                });

                if (!clientPermission) {
                    clientPermission = this.clientPermissionRepository.create({
                        client_id: data.id,
                        client_realm_id: data.realm_id,
                        permission_id: permission.id,
                        permission_realm_id: permission.realm_id,
                    });

                    await this.clientPermissionRepository.save(clientPermission);
                }
            }
        }

        // Role (Global + Realm)
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
                let clientRole = await this.clientRoleRepository.findOneBy({
                    client_id: data.id,
                    role_id: role.id,
                });

                if (!clientRole) {
                    clientRole = this.clientRoleRepository.create({
                        client_id: data.id,
                        client_realm_id: data.realm_id,
                        role_id: role.id,
                        role_realm_id: role.realm_id,
                    });

                    await this.clientRoleRepository.save(clientRole);
                }
            }
        }

        // Containers

        if (input.relations && input.relations.permissions) {
            const children = input.relations.permissions.map((child) => {
                child.data.client_id = data.id;
                child.data.client = data;
                return child;
            });

            await this.permissionSynchronizer.synchronizeMany(children);
        }

        if (input.relations && input.relations.roles) {
            const children = input.relations.roles.map((child) => {
                child.data.client_id = data.id;
                child.data.client = data;
                return child;
            });

            await this.roleSynchronizer.synchronizeMany(children);
        }

        return {
            ...input,
            data,
        };
    }
}
