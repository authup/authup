/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Permission, 
    Role, 
    UserPermission, 
    UserRole,
} from '@authup/core-kit';
import { buildUserFakeEmail } from '@authup/core-kit';
import { AuthupError } from '@authup/errors';
import { pickRecord } from '@authup/kit';
import type {
    IClientRepository,
    IUserRepository,
} from '../../../entities/index.ts';
import { ensurePath } from '../../../entities/path/helpers.ts';
import type { IPathRepository } from '../../../entities/path/types.ts';
import type { UserProvisioningEntity } from '../../entities/user/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { ProvisioningEntityResolver } from '../entity-resolver.ts';
import { ProvisioningJunctionSynchronizer } from '../junction-synchronizer.ts';
import type { UserProvisioningSynchronizerContext } from './types.ts';

export class UserProvisioningSynchronizer extends BaseProvisioningSynchronizer<UserProvisioningEntity> {
    protected userRepository: IUserRepository;

    protected clientRepository: IClientRepository;

    protected pathRepository?: IPathRepository;

    protected permissionResolver: ProvisioningEntityResolver<Permission>;

    protected roleResolver: ProvisioningEntityResolver<Role>;

    protected permissionJunction: ProvisioningJunctionSynchronizer<UserPermission>;

    protected roleJunction: ProvisioningJunctionSynchronizer<UserRole>;

    constructor(ctx: UserProvisioningSynchronizerContext) {
        super();

        this.userRepository = ctx.userRepository;
        this.clientRepository = ctx.clientRepository;
        this.pathRepository = ctx.pathRepository;

        this.permissionResolver = new ProvisioningEntityResolver(ctx.permissionRepository);
        this.roleResolver = new ProvisioningEntityResolver(ctx.roleRepository);

        this.permissionJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.userPermissionRepository,
            ownerKey: 'userId',
            ownerRealmKey: 'userRealmId',
        });
        this.roleJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.userRoleRepository,
            ownerKey: 'userId',
            ownerRealmKey: 'userRealmId',
        });
    }

    async synchronize(input: UserProvisioningEntity): Promise<UserProvisioningEntity> {
        this.canonicalizeName(input.attributes);

        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.userRepository.findOneBy({
            name: input.attributes.name,
            realmId: input.attributes.realmId || null,
        });

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.userRepository.remove(attributes);
            }
            return {
                ...input,
                attributes: attributes || input.attributes,
            };
        }

        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE: {
                    await this.resolvePath(input);

                    if (
                        strategy.attributes &&
                        strategy.attributes.includes('email')
                    ) {
                        input.attributes.email = input.attributes.email ||
                            attributes.email ||
                            buildUserFakeEmail(input.attributes.name || attributes.name);
                    }

                    // Declaring `relations.path` IS the ask, so a selective
                    // merge carries the folder whether or not its list names
                    // `pathId` (#3632).
                    const keys = strategy.attributes && input.relations && input.relations.path ?
                        [...strategy.attributes, 'pathId' as const] :
                        strategy.attributes;

                    attributes = this.userRepository.merge(
                        attributes,
                        keys ?
                            pickRecord(input.attributes, keys) :
                            input.attributes,
                    );

                    attributes = await this.userRepository.save(attributes);
                    break;
                }
                case ProvisioningEntityStrategyType.REPLACE:
                    await this.resolvePath(input);
                    input.attributes.email = input.attributes.email ||
                        attributes.email ||
                        (input.attributes.name ? buildUserFakeEmail(input.attributes.name) : undefined);

                    input.attributes.id = attributes.id;
                    attributes = await this.userRepository.save(this.userRepository.create(input.attributes));
                    break;
            }
        } else {
            await this.resolvePath(input);
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
            ...(attributes.realmId ?
                await this.permissionResolver.resolveRealm(
                    input.relations && input.relations.realmPermissions,
                    attributes.realmId,
                ) :
                []),
        ];

        if (input.relations && input.relations.clientPermissions) {
            const clientKeys = Object.keys(input.relations.clientPermissions);
            for (const clientKey of clientKeys) {
                const client = await this.clientRepository.findOneBy({
                    name: clientKey,
                    realmId: attributes.realmId,
                });

                if (client) {
                    const entities = await this.permissionResolver.resolveClient(
                        input.relations.clientPermissions[clientKey],
                        attributes.realmId,
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
                'permissionId',
                'permissionRealmId',
            );
        }

        // Roles (Global, Realm & Client)
        const roles : Role[] = [
            ...await this.roleResolver.resolveGlobal(
                input.relations && input.relations.globalRoles,
            ),
            ...(attributes.realmId ?
                await this.roleResolver.resolveRealm(
                    input.relations && input.relations.realmRoles,
                    attributes.realmId,
                ) :
                []),
        ];

        if (input.relations && input.relations.clientRoles) {
            const clientKeys = Object.keys(input.relations.clientRoles);
            for (const clientKey of clientKeys) {
                const client = await this.clientRepository.findOneBy({
                    name: clientKey,
                    realmId: attributes.realmId,
                });

                if (client) {
                    const entities = await this.roleResolver.resolveClient(
                        input.relations.clientRoles[clientKey],
                        attributes.realmId,
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
                'roleId',
                'roleRealmId',
            );
        }

        return {
            ...input,
            attributes,
        };
    }

    /**
     * A user is filed by the FULL path of its folder, so the chain is created
     * on demand and only the resolved id reaches the row.
     */
    protected async resolvePath(input: UserProvisioningEntity): Promise<void> {
        if (!input.relations || !input.relations.path) {
            return;
        }

        if (!this.pathRepository) {
            throw new AuthupError('A user path relation needs the path repository, which is not wired here.');
        }

        const entity = await ensurePath(
            this.pathRepository,
            input.attributes.realmId as string,
            input.relations.path,
        );

        input.attributes.pathId = entity.id;
    }
}
