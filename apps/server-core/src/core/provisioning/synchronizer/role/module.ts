/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission,
} from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type { IPermissionRepository, IRolePermissionRepository, IRoleRepository } from '../../../entities/index.ts';
import type { RoleProvisioningEntity } from '../../entities/role/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { RoleProvisioningSynchronizerContext } from './types.ts';

export class RoleProvisioningSynchronizer extends BaseProvisioningSynchronizer<RoleProvisioningEntity> {
    protected repository : IRoleRepository;

    protected permissionRepository : IPermissionRepository;

    protected rolePermissionRepository: IRolePermissionRepository;

    constructor(ctx: RoleProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
        this.rolePermissionRepository = ctx.rolePermissionRepository;
    }

    async synchronize(input: RoleProvisioningEntity): Promise<RoleProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);
        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || null,
            client_id: input.attributes.client_id || null,
        });
        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.repository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );

                    attributes = await this.repository.save(attributes);
                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    input.attributes.id = attributes.id;
                    attributes = await this.repository.save(this.repository.create(input.attributes));
                    break;
            }
        } else {
            attributes = await this.repository.save(this.repository.create(input.attributes));
        }

        if (!input.relations) {
            return {
                ...input,
                attributes,
            };
        }

        const permissions : Permission[] = [];

        if (input.relations.globalPermissions) {
            const hasWildcard = input.relations.globalPermissions.some((el) => el === '*');
            if (hasWildcard) {
                permissions.push(...await this.permissionRepository.findManyBy({
                    realm_id: null,
                    client_id: null,
                }));
            } else {
                permissions.push(...await this.permissionRepository.findManyBy({
                    name: input.relations.globalPermissions,
                    realm_id: null,
                    client_id: null,
                }));
            }
        }

        if (
            attributes.realm_id &&
            input.relations.realmPermissions
        ) {
            const hasWildcard = input.relations.realmPermissions.some((el) => el === '*');
            if (hasWildcard) {
                permissions.push(...await this.permissionRepository.findManyBy({
                    realm_id: attributes.realm_id,
                    client_id: null,
                }));
            } else {
                permissions.push(...await this.permissionRepository.findManyBy({
                    name: input.relations.realmPermissions,
                    realm_id: attributes.realm_id,
                    client_id: null,
                }));
            }
        }

        if (permissions.length > 0) {
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
