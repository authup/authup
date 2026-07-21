/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { PermissionName, PermissionPolicyValidator } from '@authup/core-kit';
import type { PermissionPolicy } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IPermissionPolicyRepository, IPermissionPolicyService } from './types.ts';
import { decodeQuery } from '../../query/index.ts';
import { permissionPolicySchema } from './schema.ts';

export type PermissionPolicyServiceContext = {
    repository: IPermissionPolicyRepository;
};

export class PermissionPolicyService extends JunctionEntityService implements IPermissionPolicyService {
    protected readonly ownerRealmKey = 'permissionRealmId';

    protected repository: IPermissionPolicyRepository;

    protected validator: PermissionPolicyValidator;

    constructor(ctx: PermissionPolicyServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new PermissionPolicyValidator();
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

        return this.repository.findMany(await decodeQuery(query, { schema: permissionPolicySchema, actor }));
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

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<PermissionPolicy> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_UPDATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            permissionId: validated.permissionId,
            policyId: validated.policyId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'permission-policy' });
        }

        if (validated.permission) {
            validated.permissionRealmId = validated.permission.realmId;
        }

        if (validated.policy) {
            validated.policyRealmId = validated.policy.realmId;
        }

        // Stamp the owner (permission) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_UPDATE,
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
    ): Promise<PermissionPolicy> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Stamp the owner (permission) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_UPDATE,
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
