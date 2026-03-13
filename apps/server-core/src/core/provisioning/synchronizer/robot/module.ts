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
    IClientRepository,
    IPermissionRepository,
    IRobotPermissionRepository,
    IRobotRepository,
    IRobotRoleRepository,
    IRoleRepository,
} from '../../../entities/index.ts';
import type { RobotProvisioningEntity } from '../../entities/robot/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RobotProvisioningSynchronizerContext } from './types.ts';

export class RobotProvisioningSynchronizer extends BaseProvisioningSynchronizer<RobotProvisioningEntity> {
    protected robotRepository: IRobotRepository;

    protected robotRoleRepository: IRobotRoleRepository;

    protected robotPermissionRepository: IRobotPermissionRepository;

    protected roleRepository: IRoleRepository;

    protected permissionRepository: IPermissionRepository;

    protected clientRepository: IClientRepository;

    constructor(ctx: RobotProvisioningSynchronizerContext) {
        super();

        this.robotRepository = ctx.robotRepository;
        this.robotRoleRepository = ctx.robotRoleRepository;
        this.robotPermissionRepository = ctx.robotPermissionRepository;
        this.roleRepository = ctx.roleRepository;
        this.permissionRepository = ctx.permissionRepository;
        this.clientRepository = ctx.clientRepository;
    }

    async synchronize(input: RobotProvisioningEntity): Promise<RobotProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.robotRepository.findOneBy({
            name: input.attributes.name,
            ...(input.attributes.realm_id ? { realm_id: input.attributes.realm_id } : { realm_id: null }),
        });
        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.robotRepository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );

                    attributes = await this.robotRepository.save(attributes);
                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    input.attributes.id = attributes.id;
                    attributes = await this.robotRepository.save(this.robotRepository.create(input.attributes));
                    break;
            }
        } else {
            attributes = await this.robotRepository.save(this.robotRepository.create(input.attributes));
        }

        // Permissions (Global, Realm & Client)
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

                let robotPermission = await this.robotPermissionRepository.findOneBy({
                    robot_id: attributes.id,
                    permission_id: permission.id,
                });

                if (!robotPermission) {
                    robotPermission = this.robotPermissionRepository.create({
                        robot_id: attributes.id,
                        robot_realm_id: attributes.realm_id,
                        permission_id: permission.id,
                        permission_realm_id: permission.realm_id,
                    });

                    await this.robotPermissionRepository.save(robotPermission);
                }
            }
        }

        // Role (Global & Realm)
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

                let robotRole = await this.robotRoleRepository.findOneBy({
                    robot_id: attributes.id,
                    role_id: role.id,
                });

                if (!robotRole) {
                    robotRole = this.robotRoleRepository.create({
                        robot_id: attributes.id,
                        robot_realm_id: attributes.realm_id,
                        role_id: role.id,
                        role_realm_id: role.realm_id,
                    });

                    await this.robotRoleRepository.save(robotRole);
                }
            }
        }

        return {
            ...input,
            attributes,
        };
    }
}
