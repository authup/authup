/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, Permission, Role, User, UserPermission, UserRole,
} from '@authup/core-kit';
import {
    buildUserFakeEmail,
} from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { In, IsNull } from 'typeorm';
import type { UserProvisioningContainer } from '../../entities/user';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { UserProvisioningSynchronizerContext } from './types.ts';

export class UserProvisioningSynchronizer extends BaseProvisioningSynchronizer<UserProvisioningContainer> {
    protected userRepository: Repository<User>;

    protected userRoleRepository: Repository<UserRole>;

    protected userPermissionRepository: Repository<UserPermission>;

    protected roleRepository: Repository<Role>;

    protected permissionRepository: Repository<Permission>;

    protected clientRepository: Repository<Client>;

    constructor(ctx: UserProvisioningSynchronizerContext) {
        super();

        this.userRepository = ctx.userRepository;
        this.userRoleRepository = ctx.userRoleRepository;
        this.userPermissionRepository = ctx.userPermissionRepository;
        this.roleRepository = ctx.roleRepository;
        this.permissionRepository = ctx.permissionRepository;
        this.clientRepository = ctx.clientRepository;
    }

    async synchronize(input: UserProvisioningContainer): Promise<UserProvisioningContainer> {
        let data = await this.userRepository.findOneBy({
            name: input.data.name,
            realm_id: input.data.realm_id || IsNull(),
            client_id: input.data.client_id || IsNull(),
        });
        if (!data) {
            if (input.data.name) {
                input.data.email = buildUserFakeEmail(input.data.name);
            }

            data = await this.userRepository.save(input.data);
        }

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

        if (input.relations && input.relations.clientPermissions) {
            const clientKeys = Object.keys(input.relations.clientPermissions);
            for (let i = 0; i < clientKeys.length; i++) {
                const client = await this.clientRepository.findOneBy({
                    name: clientKeys[i],
                    realm_id: data.realm_id,
                });

                if (client) {
                    let entities : Permission[] = [];

                    const hasWildcard = input.relations.clientPermissions[clientKeys[i]].some((el) => el === '*');
                    if (hasWildcard) {
                        entities = await this.permissionRepository.findBy({
                            realm_id: data.realm_id,
                            client_id: client.id,
                        });
                    } else {
                        entities = await this.permissionRepository.findBy({
                            name: In(input.relations.clientPermissions[clientKeys[i]]),
                            realm_id: data.realm_id,
                            client_id: client.id,
                        });
                    }

                    permissions.push(...entities);
                }
            }
        }

        if (permissions.length > 0) {
            for (let i = 0; i < permissions.length; i++) {
                const permission = permissions[i];

                let userPermission = await this.userPermissionRepository.findOneBy({
                    user_id: data.id,
                    permission_id: permission.id,
                });

                if (!userPermission) {
                    userPermission = this.userPermissionRepository.create({
                        user_id: data.id,
                        user_realm_id: data.realm_id,
                        permission_id: permission.id,
                        permission_realm_id: permission.realm_id,
                    });

                    await this.userPermissionRepository.save(userPermission);
                }
            }
        }

        // Role (Global, Realm & Client)
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

        if (input.relations && input.relations.clientRoles) {
            const clientKeys = Object.keys(input.relations.clientRoles);
            for (let i = 0; i < clientKeys.length; i++) {
                const client = await this.clientRepository.findOneBy({
                    name: clientKeys[i],
                    realm_id: data.realm_id,
                });

                if (client) {
                    let entities : Role[];

                    const hasWildcard = input.relations.clientRoles[clientKeys[i]].some((el) => el === '*');
                    if (hasWildcard) {
                        entities = await this.roleRepository.findBy({
                            realm_id: data.realm_id,
                            client_id: client.id,
                        });
                    } else {
                        entities = await this.roleRepository.findBy({
                            name: In(input.relations.clientRoles[clientKeys[i]]),
                            realm_id: data.realm_id,
                            client_id: client.id,
                        });
                    }

                    roles.push(...entities);
                }
            }
        }

        if (roles.length > 0) {
            for (let i = 0; i < roles.length; i++) {
                const role = roles[i];

                let userRole = await this.userRoleRepository.findOneBy({
                    user_id: data.id,
                    role_id: role.id,
                });

                if (!userRole) {
                    userRole = this.userRoleRepository.create({
                        user_id: data.id,
                        user_realm_id: data.realm_id,
                        role_id: role.id,
                        role_realm_id: role.realm_id,
                    });

                    await this.userRoleRepository.save(userRole);
                }
            }
        }

        return {
            ...input,
            data,
        };
    }
}
