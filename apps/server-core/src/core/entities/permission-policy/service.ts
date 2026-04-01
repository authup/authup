/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { PermissionPolicy } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IPermissionPolicyRepository, IPermissionPolicyService } from './types.ts';

export type PermissionPolicyServiceContext = {
    repository: IPermissionPolicyRepository;
};

export class PermissionPolicyService extends AbstractEntityService implements IPermissionPolicyService {
    protected repository: IPermissionPolicyRepository;

    constructor(ctx: PermissionPolicyServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<PermissionPolicy>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<PermissionPolicy> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
            ],
        });

        const entity = await this.repository.findOneBy({
            id 
        });
        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<PermissionPolicy> {
        await actor.permissionEvaluator.preEvaluate({
            name: PermissionName.PERMISSION_UPDATE 
        });

        await this.repository.validateJoinColumns(data);

        if (data.permission) {
            data.permission_realm_id = data.permission.realm_id;
        }

        if (data.policy) {
            data.policy_realm_id = data.policy.realm_id;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_UPDATE,
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
    ): Promise<PermissionPolicy> {
        await actor.permissionEvaluator.preEvaluate({
            name: PermissionName.PERMISSION_UPDATE 
        });

        const entity = await this.repository.findOneBy({
            id 
        });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_UPDATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const {
            id: entityId 
        } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
