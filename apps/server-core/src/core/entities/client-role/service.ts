/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError, definePolicyData } from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { ClientRoleValidator, PermissionName } from '@authup/core-kit';
import type { ClientRole } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IClientRoleRepository, IClientRoleService } from './types.ts';

export type ClientRoleServiceContext = {
    repository: IClientRoleRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class ClientRoleService extends JunctionEntityService implements IClientRoleService {
    protected readonly ownerRealmKey = 'clientRealmId';

    protected repository: IClientRoleRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: ClientRoleValidator;

    constructor(ctx: ClientRoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new ClientRoleValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientRole>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_ROLE_READ,
                PermissionName.CLIENT_ROLE_UPDATE,
                PermissionName.CLIENT_ROLE_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientRole> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_ROLE_READ,
                PermissionName.CLIENT_ROLE_UPDATE,
                PermissionName.CLIENT_ROLE_DELETE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<ClientRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_ROLE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            roleId: validated.roleId,
            clientId: validated.clientId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'client-role' });
        }

        if (validated.role) {
            validated.roleRealmId = validated.role.realmId;
        }

        if (validated.client) {
            validated.clientRealmId = validated.client.realmId;
        }

        if (validated.role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    type: 'role',
                    id: validated.roleId,
                    clientId: validated.role.clientId,
                },
            );
            if (!hasPermissions) {
                throw new PermissionError({ message: 'You don\'t own the required permissions.' });
            }
        }

        // Stamp the owner (client) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_ROLE_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(validated),
            }),
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Stamp the owner (client) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_ROLE_DELETE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(entity),
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
