/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission, 
    RobotPermission, 
    RobotRole, 
    Role,
} from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type { IRobotRepository } from '../../../entities/index.ts';
import type { RobotProvisioningEntity } from '../../entities/robot/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { ProvisioningEntityResolver } from '../entity-resolver.ts';
import { ProvisioningJunctionSynchronizer } from '../junction-synchronizer.ts';
import type { RobotProvisioningSynchronizerContext } from './types.ts';

export class RobotProvisioningSynchronizer extends BaseProvisioningSynchronizer<RobotProvisioningEntity> {
    protected robotRepository: IRobotRepository;

    protected permissionResolver: ProvisioningEntityResolver<Permission>;

    protected roleResolver: ProvisioningEntityResolver<Role>;

    protected permissionJunction: ProvisioningJunctionSynchronizer<RobotPermission>;

    protected roleJunction: ProvisioningJunctionSynchronizer<RobotRole>;

    constructor(ctx: RobotProvisioningSynchronizerContext) {
        super();

        this.robotRepository = ctx.robotRepository;

        this.permissionResolver = new ProvisioningEntityResolver(ctx.permissionRepository);
        this.roleResolver = new ProvisioningEntityResolver(ctx.roleRepository);

        this.permissionJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.robotPermissionRepository,
            ownerKey: 'robot_id',
            ownerRealmKey: 'robot_realm_id',
        });
        this.roleJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.robotRoleRepository,
            ownerKey: 'robot_id',
            ownerRealmKey: 'robot_realm_id',
        });
    }

    async synchronize(input: RobotProvisioningEntity): Promise<RobotProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.robotRepository.findOneBy({
            name: input.attributes.name,
            ...(input.attributes.realm_id ? { realm_id: input.attributes.realm_id } : { realm_id: null }),
        });

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.robotRepository.remove(attributes);
            }
            return {
                ...input,
                attributes: attributes || input.attributes, 
            };
        }

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

        // Permissions (Global & Realm)
        const permissions = [
            ...await this.permissionResolver.resolveGlobal(
                input.relations && input.relations.globalPermissions,
            ),
            ...(attributes.realm_id ?
                await this.permissionResolver.resolveRealm(
                    input.relations && input.relations.realmPermissions,
                    attributes.realm_id,
                ) :
                []),
        ];

        if (permissions.length > 0) {
            await this.permissionJunction.synchronize(
                attributes,
                permissions,
                'permission_id',
                'permission_realm_id',
            );
        }

        // Roles (Global & Realm)
        const roles = [
            ...await this.roleResolver.resolveGlobal(
                input.relations && input.relations.globalRoles,
            ),
            ...(attributes.realm_id ?
                await this.roleResolver.resolveRealm(
                    input.relations && input.relations.realmRoles,
                    attributes.realm_id,
                ) :
                []),
        ];

        if (roles.length > 0) {
            await this.roleJunction.synchronize(
                attributes,
                roles,
                'role_id',
                'role_realm_id',
            );
        }

        return {
            ...input,
            attributes,
        };
    }
}
