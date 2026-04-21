/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { ConflictError, NotFoundError } from '@ebec/http';
import { ClientPermissionValidator, PermissionName, ValidatorGroup } from '@authup/core-kit';
import type { ClientPermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IClientPermissionRepository, IClientPermissionService } from './types.ts';

export type ClientPermissionServiceContext = {
    repository: IClientPermissionRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class ClientPermissionService extends AbstractEntityService implements IClientPermissionService {
    protected repository: IClientPermissionRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: ClientPermissionValidator;

    constructor(ctx: ClientPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
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

        return this.repository.findMany(query);
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
            throw new NotFoundError();
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
            client_id: validated.client_id,
            permission_id: validated.permission_id,
        });
        if (existing) {
            throw new ConflictError('The client-permission assignment already exists.');
        }

        if (validated.permission) {
            validated.permission_realm_id = validated.permission.realm_id;

            await actor.permissionEvaluator.preEvaluate({
                name: validated.permission.name,
                realmId: validated.permission.realm_id,
                clientId: validated.permission.client_id,
            });
        }

        if (validated.client) {
            validated.client_realm_id = validated.client.realm_id;
        }

        if (
            validated.permission &&
            actor.identity &&
            typeof validated.policy_id === 'undefined'
        ) {
            const junctionPolicy = await this.identityPermissionProvider.resolveJunctionPolicy(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    name: validated.permission.name,
                    realmId: validated.permission.realm_id,
                    clientId: validated.permission.client_id,
                },
            );
            if (junctionPolicy) {
                validated.policy_id = junctionPolicy.id;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
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
            throw new NotFoundError();
        }

        const updateData: Record<string, any> = {};
        if (Object.prototype.hasOwnProperty.call(data, 'policy_id')) {
            updateData.policy_id = data.policy_id;
        }

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: merged }),
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
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_DELETE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
