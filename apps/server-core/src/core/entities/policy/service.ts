/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import type { IQuery } from '@rapiq/core';
import {
    ValidatorGroup,
    extendObject,
    isPropertySet,
    isUUID,
    removeObjectProperty,
} from '@authup/kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import {
    PermissionName,
    PolicyValidator,
} from '@authup/core-kit';
import type { Policy } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '@authup/server-kit';
import { PolicyAttributesValidator } from './attributes-validator.ts';
import type { IPolicyRepository, IPolicyService } from './types.ts';
import { decodeQuery, scopeReadQuery } from '../../query/index.ts';
import type { ReadScope } from '../../query/index.ts';
import { policySchema } from './schema.ts';

export type PolicyServiceContext = {
    repository: IPolicyRepository;
    realmRepository: IRealmRepository;
};

const PERMISSION_NAMES = [
    PermissionName.PERMISSION_READ,
    PermissionName.PERMISSION_UPDATE,
    PermissionName.PERMISSION_DELETE,
];

export class PolicyService extends AbstractEntityService implements IPolicyService {
    protected repository: IPolicyRepository;

    protected realmRepository: IRealmRepository;

    protected validator: PolicyValidator;

    protected attributesValidator: PolicyAttributesValidator;

    constructor(ctx: PolicyServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new PolicyValidator();
        this.attributesValidator = new PolicyAttributesValidator({});
    }

    async scopeRead(query: IQuery, actor: ActorContext): Promise<ReadScope> {
        return scopeReadQuery(query, actor, { names: PERMISSION_NAMES });
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Policy>> {
        const parsed = await decodeQuery(query, { schema: policySchema, actor });

        // the list's gate, shared with the entity's statistic (scopeRead):
        // a reach that lowers runs as WHERE, so pagination and totals stay
        // exact; a non-expressible policy falls back to the per-row loop below
        const scope = await this.scopeRead(parsed, actor);
        const { data: entities, meta } = await this.repository.findMany(scope.query);

        if (!scope.post) {
            return { data: entities, meta };
        }

        const data: Policy[] = [];
        let { total } = meta;

        for (const entity of entities) {
            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: PERMISSION_NAMES,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        ...this.resourceRealmMatch(entity),
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
            }
        }

        return {
            data,
            meta: {
                ...meta,
                total,
            },
        };
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
        realm?: string,
    ): Promise<Policy> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const entity = await this.repository.findOneByIdOrName(idOrName, realm);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: PERMISSION_NAMES,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
                ...this.resourceRealmMatch(entity),
            }),
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Policy> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Policy> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{
        entity: Policy,
        created: boolean 
    }> {
        let group: string;

        const realm = typeof data.realmId === 'string' ?
            await this.realmRepository.resolve(data.realmId) :
            undefined;

        let entity: Policy | null | undefined;
        if (idOrName) {
            const where: Record<string, any> = {};
            if (isUUID(idOrName)) {
                where.id = idOrName;
            } else {
                where.name = idOrName;
            }

            if (realm) {
                where.realmId = realm.id;
            }

            entity = await this.repository.findOneBy(where);
            // Only a NAME key may upsert-create. A UUID addresses one specific
            // row, so a miss is a 404 (creating would write a different id).
            if (!entity && (options.updateOnly || where.id)) {
                throw new EntityNotFoundError();
            }
        } else if (options.updateOnly) {
            throw new EntityNotFoundError();
        }

        if (entity) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_UPDATE });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validate(data, group);

        await this.repository.validateJoinColumns(validated);

        if (
            validated.parent &&
            validated.parent.type !== BuiltInPolicyType.COMPOSITE
        ) {
            throw new ValidationError('The parent policy must be of type group.');
        }

        if (entity) {
            if (entity.builtIn) {
                throw new ValidationError('A built-in policy can not be updated.');
            }

            await actor.permissionEvaluator.evaluate({
                name: PermissionName.PERMISSION_UPDATE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...validated,
                    },
                    [BuiltInPolicyType.REALM_MATCH]: validated.realmId ?? entity.realmId ?? null,
                }),
            });

            await this.repository.checkUniqueness(validated, entity);

            extendObject(entity, validated);

            await this.repository.saveWithEA(entity);

            return {
                entity,
                created: false, 
            };
        }

        if (!isPropertySet(validated, 'realmId') && actor.identity) {
            validated.realmId = this.getActorRealmId(actor) || null;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_CREATE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated, ...this.resourceRealmMatch(validated) }),
        });

        await this.repository.checkUniqueness(validated);

        entity = this.repository.create(validated);
        await this.repository.saveWithEA(entity);

        return {
            entity,
            created: true, 
        };
    }

    private async validate(
        data: Record<string, any>,
        group: string,
    ): Promise<Policy> {
        const validated = await this.validator.run(data, { group });

        const attributes = await this.attributesValidator.run(data);
        extendObject(validated, attributes);

        if (Array.isArray(data.children)) {
            if (data.type === BuiltInPolicyType.COMPOSITE) {
                const promises = data.children.map(
                    (child) => this.validate(child, group),
                );
                validated.children = await Promise.all(promises);
            }
        }

        return validated;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Policy> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (entity.builtIn) {
            throw new ValidationError('A built-in policy can not be deleted.');
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_DELETE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        const { id: entityId } = entity;

        await this.repository.deleteFromTree(entity);

        entity.id = entityId;

        // todo: remove after PolicyEntity - parent delete on cascade
        removeObjectProperty(entity, 'children');

        return entity;
    }
}
