/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { ConflictError, NotFoundError } from '@ebec/http';
import { ClientScopeValidator, PermissionName, ValidatorGroup } from '@authup/core-kit';
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

    protected validator: ClientScopeValidator;

    constructor(ctx: ClientScopeServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new ClientScopeValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientScope>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
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
        await actor.permissionEvaluator.preEvaluateOneOf({
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
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_SCOPE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            client_id: validated.client_id,
            scope_id: validated.scope_id,
        });
        if (existing) {
            throw new ConflictError('The client-scope assignment already exists.');
        }

        if (validated.client) {
            validated.client_realm_id = validated.client.realm_id;
        }

        if (validated.scope) {
            validated.scope_realm_id = validated.scope.realm_id;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_SCOPE_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientScope> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_SCOPE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_SCOPE_DELETE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
