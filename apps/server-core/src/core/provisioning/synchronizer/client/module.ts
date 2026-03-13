/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission, Role,
} from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type {
    IClientPermissionRepository,
    IClientRepository,
    IClientRoleRepository,
    IPermissionRepository,
    IRoleRepository,
} from '../../../entities/index.ts';
import type { ClientProvisioningEntity } from '../../entities/client';
import type { PermissionProvisioningEntity } from '../../entities/permission';
import type { RoleProvisioningEntity } from '../../entities/role';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import type {
    IProvisioningSynchronizer,

} from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { ClientProvisioningSynchronizerContext } from './types.ts';

export class ClientProvisioningSynchronizer extends BaseProvisioningSynchronizer<ClientProvisioningEntity> {
    protected clientRepository: IClientRepository;

    protected clientRoleRepository: IClientRoleRepository;

    protected clientPermissionRepository: IClientPermissionRepository;

    protected roleRepository: IRoleRepository;

    protected permissionRepository: IPermissionRepository;

    protected permissionSynchronizer: IProvisioningSynchronizer<PermissionProvisioningEntity>;

    protected roleSynchronizer: IProvisioningSynchronizer<RoleProvisioningEntity>;

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

    async synchronize(input: ClientProvisioningEntity): Promise<ClientProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.clientRepository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || null,
        });
        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.clientRepository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );
                    attributes = await this.clientRepository.save(attributes);
                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    input.attributes.id = attributes.id;
                    attributes = await this.clientRepository.save(this.clientRepository.create(input.attributes));
                    break;
            }
        } else {
            attributes = await this.clientRepository.save(this.clientRepository.create(input.attributes));
        }

        // Permissions (Global + Realm)

        const permissions : Permission[] = [];
        if (input.relations && input.relations.globalPermissions) {
            let entities : Permission[];

            const hasWildcard = input.relations.globalPermissions.some((el) => el === '*');
            if (hasWildcard) {
                entities = await this.permissionRepository.findManyBy({
                    realm_id: null,
                    client_id: null,
                });
            } else {
                entities = await this.permissionRepository.findManyBy({
                    name: input.relations.globalPermissions,
                    realm_id: null,
                    client_id: null,
                });
            }

            permissions.push(...entities);
        }

        if (input.relations && input.relations.realmPermissions) {
            let entities : Permission[];

            const hasWildcard = input.relations.realmPermissions.some((el) => el === '*');
            if (hasWildcard) {
                entities = await this.permissionRepository.findManyBy({
                    realm_id: attributes.realm_id,
                    client_id: null,
                });
            } else {
                entities = await this.permissionRepository.findManyBy({
                    name: input.relations.realmPermissions,
                    realm_id: attributes.realm_id,
                    client_id: null,
                });
            }

            permissions.push(...entities);
        }

        if (permissions.length > 0) {
            for (let i = 0; i < permissions.length; i++) {
                const permission = permissions[i];

                let clientPermission = await this.clientPermissionRepository.findOneBy({
                    client_id: attributes.id,
                    permission_id: permission.id,
                });

                if (!clientPermission) {
                    clientPermission = this.clientPermissionRepository.create({
                        client_id: attributes.id,
                        client_realm_id: attributes.realm_id,
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
                entities = await this.roleRepository.findManyBy({
                    realm_id: null,
                    client_id: null,
                });
            } else {
                entities = await this.roleRepository.findManyBy({
                    name: input.relations.globalRoles,
                    realm_id: null,
                    client_id: null,
                });
            }

            roles.push(...entities);
        }

        if (input.relations && input.relations.realmRoles) {
            let entities : Role[];

            const hasWildcard = input.relations.realmRoles.some((el) => el === '*');
            if (hasWildcard) {
                entities = await this.roleRepository.findManyBy({
                    realm_id: attributes.realm_id,
                    client_id: null,
                });
            } else {
                entities = await this.roleRepository.findManyBy({
                    name: input.relations.realmRoles,
                    realm_id: attributes.realm_id,
                    client_id: null,
                });
            }

            roles.push(...entities);
        }

        if (roles.length > 0) {
            for (let i = 0; i < roles.length; i++) {
                const role = roles[i];
                let clientRole = await this.clientRoleRepository.findOneBy({
                    client_id: attributes.id,
                    role_id: role.id,
                });

                if (!clientRole) {
                    clientRole = this.clientRoleRepository.create({
                        client_id: attributes.id,
                        client_realm_id: attributes.realm_id,
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
                child.attributes.client_id = attributes.id;
                child.attributes.client = attributes;
                return child;
            });

            await this.permissionSynchronizer.synchronizeMany(children);
        }

        if (input.relations && input.relations.roles) {
            const children = input.relations.roles.map((child) => {
                child.attributes.client_id = attributes.id;
                child.attributes.client = attributes;
                return child;
            });

            await this.roleSynchronizer.synchronizeMany(children);
        }

        return {
            ...input,
            attributes,
        };
    }
}
