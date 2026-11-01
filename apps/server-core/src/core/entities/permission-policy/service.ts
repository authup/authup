/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    evaluateRecord,
    evaluateRecordOneOf,
    reachesRecordOneOf,
} from '@authup/access';
import { inArray } from '@rapiq/core';
import { EntityConflictError, EntityNotFoundError, ValidationError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { PermissionName, PermissionPolicyValidator } from '@authup/core-kit';
import type { PermissionPolicy } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IPermissionPolicyRepository, IPermissionPolicyService } from './types.ts';
import { appendQueryConditions, decodeQuery, redactUnreachedRelations } from '../../query/index.ts';
import { permissionPolicySchema } from './schema.ts';
import { isRealmReachable } from '../realm/helpers.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.PERMISSION_READ,
    PermissionName.PERMISSION_UPDATE,
];

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
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: permissionPolicySchema, actor });

        // The realm reach of the grant, compiled into a row condition and lowered onto
        // the OWNER realm key — a junction row carries no `realmId` (issue #3594).
        const compiled = await actor.permissionEvaluator.compile({
            name: READ_PERMISSION_NAMES,
            realmAttributeName: this.ownerRealmKey,
        });

        if (compiled.verdict === 'deny') {
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        if (compiled.verdict !== 'post') {
            return { data: await redactUnreachedRelations(entities, parsed, permissionPolicySchema, actor), meta };
        }

        const data: PermissionPolicy[] = [];
        let { total } = meta;

        for (const entity of entities) {
            const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
                name: READ_PERMISSION_NAMES,
                realm: this.junctionResourceRealm(entity),
                data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
            });

            if (!reached) {
                total -= 1;

                continue;
            }

            data.push(entity);
        }

        return { data: await redactUnreachedRelations(data, parsed, permissionPolicySchema, actor), meta: { ...meta, total } };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<PermissionPolicy> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecordOneOf(actor.permissionEvaluator, {
            name: READ_PERMISSION_NAMES,
            realm: this.junctionResourceRealm(entity),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
        });

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

            if (!isRealmReachable(validated.policy.realmId, validated.permissionRealmId)) {
                throw new ValidationError('It is not possible to bind a policy of another realm to a permission.');
            }
        }

        // Stamp the owner (permission) realm so the realmScope factor gates cross-realm writes.
        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.PERMISSION_UPDATE,
            realm: this.junctionResourceRealm(validated),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated) },
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
        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.PERMISSION_UPDATE,
            realm: this.junctionResourceRealm(entity),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
