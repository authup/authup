/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { ClientRoleValidator, PermissionName, ValidatorGroup } from '@authup/core-kit';
import type { ClientRole } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IClientRoleRepository, IClientRoleService } from './types.ts';

export type ClientRoleServiceContext = {
    repository: IClientRoleRepository;
};

export class ClientRoleService extends AbstractEntityService implements IClientRoleService {
    protected repository: IClientRoleRepository;

    protected validator: ClientRoleValidator;

    constructor(ctx: ClientRoleServiceContext) {
        super();
        this.repository = ctx.repository;
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
            throw new NotFoundError();
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

        if (validated.role) {
            validated.role_realm_id = validated.role.realm_id;
        }

        if (validated.client) {
            validated.client_realm_id = validated.client.realm_id;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_ROLE_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
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
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_ROLE_DELETE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
