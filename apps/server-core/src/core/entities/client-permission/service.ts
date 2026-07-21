/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    RealmScope,
    definePolicyData,
} from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { ClientPermissionValidator, PermissionName } from '@authup/core-kit';
import type { ClientPermission, Permission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import { applyJunctionCreateGrant, buildJunctionUpdateData } from '../../identity/permission/junction-grant.ts';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IClientPermissionRepository, IClientPermissionService } from './types.ts';
import { decodeQuery } from '../../query/index.ts';
import { clientPermissionSchema } from './schema.ts';

export type ClientPermissionServiceContext = {
    repository: IClientPermissionRepository;
    permissionRepository: IEntityRepository<Permission>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class ClientPermissionService extends JunctionEntityService implements IClientPermissionService {
    protected readonly ownerRealmKey = 'clientRealmId';

    protected repository: IClientPermissionRepository;

    protected permissionRepository: IEntityRepository<Permission>;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: ClientPermissionValidator;

    constructor(ctx: ClientPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new ClientPermissionValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientPermission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
            ],
        });

        return this.repository.findMany(await decodeQuery(query, { schema: clientPermissionSchema, actor }));
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
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
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_PERMISSION_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            clientId: validated.clientId,
            permissionId: validated.permissionId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'client-permission' });
        }

        if (validated.permission) {
            validated.permissionRealmId = validated.permission.realmId;

            await actor.permissionEvaluator.preEvaluate({
                name: validated.permission.name,
                realmId: validated.permission.realmId,
                clientId: validated.permission.clientId,
            });
        }

        if (validated.client) {
            validated.clientRealmId = validated.client.realmId;
        }

        if (validated.permission && actor.identity) {
            const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    name: validated.permission.name,
                    realmId: validated.permission.realmId,
                    clientId: validated.permission.clientId,
                    realmScope: validated.realmScope ?? RealmScope.OWN,
                },
            );

            applyJunctionCreateGrant(validated, grant);
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(validated),
            }),
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_PERMISSION_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        const permission = await this.permissionRepository.findOneById(entity.permissionId);
        if (permission) {
            // Member-permission gate: an actor may only modify a binding for a permission it
            // holds (mirrors create()).
            await actor.permissionEvaluator.preEvaluate({
                name: permission.name,
                realmId: permission.realmId,
                clientId: permission.clientId,
            });
        }

        let actorScope: `${RealmScope}` = RealmScope.ANY;
        let actorPolicyFree = true;
        let actorPolicyId: string | null = null;
        if (actor.identity && permission) {
            const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                { type: actor.identity.type, id: actor.identity.data.id },
                {
                    name: permission.name,
                    realmId: permission.realmId,
                    clientId: permission.clientId,
                    realmScope: validated.realmScope ?? entity.realmScope,
                },
            );
            actorScope = grant.realmScope;
            actorPolicyFree = !grant.policy;
            actorPolicyId = grant.policy ? grant.policy.id : null;
        } else if (actor.identity) {
            actorScope = RealmScope.OWN;
        }

        const updateData = buildJunctionUpdateData({
            data: validated,
            existingScope: entity.realmScope,
            actorScope,
            actorPolicyFree,
            actorPolicyId,
        });

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_UPDATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(merged),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(merged),
            }),
        });

        return this.repository.save(merged);
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_DELETE,
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
