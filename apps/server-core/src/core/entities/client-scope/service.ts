/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { ClientScope } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IClientScopeRepository, IClientScopeService } from './types.ts';

export type ClientScopeServiceContext = {
    repository: IClientScopeRepository;
};

export class ClientScopeService extends AbstractEntityService implements IClientScopeService {
    protected repository: IClientScopeRepository;

    constructor(ctx: ClientScopeServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientScope>> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_READ,
                PermissionName.CLIENT_UPDATE,
                PermissionName.CLIENT_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientScope> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_READ,
                PermissionName.CLIENT_UPDATE,
                PermissionName.CLIENT_DELETE,
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
    ): Promise<ClientScope> {
        await actor.permissionChecker.preCheck({ name: PermissionName.CLIENT_SCOPE_CREATE });

        await this.repository.validateJoinColumns(data);

        if (data.client) {
            data.client_realm_id = data.client.realm_id;
        }

        if (data.scope) {
            data.scope_realm_id = data.scope.realm_id;
        }

        await actor.permissionChecker.check({
            name: PermissionName.CLIENT_SCOPE_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: data,
            }),
        });

        let entity = this.repository.create(data);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientScope> {
        await actor.permissionChecker.preCheck({ name: PermissionName.CLIENT_SCOPE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionChecker.check({
            name: PermissionName.CLIENT_SCOPE_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
