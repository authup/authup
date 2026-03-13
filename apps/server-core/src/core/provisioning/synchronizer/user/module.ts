/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission, Role, UserPermission, UserRole,
} from '@authup/core-kit';
import {
    buildUserFakeEmail,
} from '@authup/core-kit';
import { pickRecord } from '@authup/kit';
import type {
    IClientRepository,
    IUserRepository,
} from '../../../entities/index.ts';
import type { UserProvisioningEntity } from '../../entities/user/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { ProvisioningEntityResolver } from '../entity-resolver.ts';
import { ProvisioningJunctionSynchronizer } from '../junction-synchronizer.ts';
import type { UserProvisioningSynchronizerContext } from './types.ts';

export class UserProvisioningSynchronizer extends BaseProvisioningSynchronizer<UserProvisioningEntity> {
    protected userRepository: IUserRepository;

    protected clientRepository: IClientRepository;

    protected permissionResolver: ProvisioningEntityResolver<Permission>;

    protected roleResolver: ProvisioningEntityResolver<Role>;

    protected permissionJunction: ProvisioningJunctionSynchronizer<UserPermission>;

    protected roleJunction: ProvisioningJunctionSynchronizer<UserRole>;

    constructor(ctx: UserProvisioningSynchronizerContext) {
        super();

        this.userRepository = ctx.userRepository;
        this.clientRepository = ctx.clientRepository;

        this.permissionResolver = new ProvisioningEntityResolver(ctx.permissionRepository);
        this.roleResolver = new ProvisioningEntityResolver(ctx.roleRepository);

        this.permissionJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.userPermissionRepository,
            ownerKey: 'user_id',
            ownerRealmKey: 'user_realm_id',
        });
        this.roleJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.userRoleRepository,
            ownerKey: 'user_id',
            ownerRealmKey: 'user_realm_id',
        });
    }

    async synchronize(input: UserProvisioningEntity): Promise<UserProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.userRepository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || null,
            client_id: input.attributes.client_id || null,
        });

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.userRepository.remove(attributes);
            }
            return { ...input, attributes: attributes || input.attributes };
        }

        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    if (
                        strategy.attributes &&
                        strategy.attributes.indexOf('email') !== -1
                    ) {
                        input.attributes.email = input.attributes.email ||
                            attributes.email ||
                            buildUserFakeEmail(input.attributes.name || attributes.name);
                    }

                    attributes = this.userRepository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );

                    attributes = await this.userRepository.save(attributes);
                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    if (!input.attributes.email && input.attributes.name) {
                        input.attributes.email = buildUserFakeEmail(input.attributes.name);
                    }

                    input.attributes.id = attributes.id;
                    attributes = await this.userRepository.save(this.userRepository.create(input.attributes));
                    break;
            }
        } else {
            if (!input.attributes.email && input.attributes.name) {
                input.attributes.email = buildUserFakeEmail(input.attributes.name);
            }

            attributes = await this.userRepository.save(this.userRepository.create(input.attributes));
        }

        // Permissions (Global, Realm & Client)
        const permissions : Permission[] = [
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

        if (input.relations && input.relations.clientPermissions) {
            const clientKeys = Object.keys(input.relations.clientPermissions);
            for (let i = 0; i < clientKeys.length; i++) {
                const client = await this.clientRepository.findOneBy({
                    name: clientKeys[i],
                    realm_id: attributes.realm_id,
                });

                if (client) {
                    const entities = await this.permissionResolver.resolveClient(
                        input.relations.clientPermissions[clientKeys[i]],
                        attributes.realm_id,
                        client.id,
                    );
                    permissions.push(...entities);
                }
            }
        }

        if (permissions.length > 0) {
            await this.permissionJunction.synchronize(
                attributes,
                permissions,
                'permission_id',
                'permission_realm_id',
            );
        }

        // Roles (Global, Realm & Client)
        const roles : Role[] = [
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

        if (input.relations && input.relations.clientRoles) {
            const clientKeys = Object.keys(input.relations.clientRoles);
            for (let i = 0; i < clientKeys.length; i++) {
                const client = await this.clientRepository.findOneBy({
                    name: clientKeys[i],
                    realm_id: attributes.realm_id,
                });

                if (client) {
                    const entities = await this.roleResolver.resolveClient(
                        input.relations.clientRoles[clientKeys[i]],
                        attributes.realm_id,
                        client.id,
                    );
                    roles.push(...entities);
                }
            }
        }

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
