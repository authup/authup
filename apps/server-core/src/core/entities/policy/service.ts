/*
 * Copyright (c) 2025.
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
import type { PolicyValidators } from '@authup/access';
import type { IQuery } from '@rapiq/core';
import {
    ValidatorGroup,
    extendObject,
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
import { decodeQuery, redactUnreachedRelations, scopeReadQuery } from '../../query/index.ts';
import type { ReadScope } from '../../query/index.ts';
import { policySchema } from './schema.ts';
import { StaleRowSignal, assertRowUnchanged, retryOnStaleRow } from '../stale-row/index.ts';

export type PolicyServiceContext = {
    repository: IPolicyRepository;
    realmRepository: IRealmRepository;
    /**
     * The option validator per policy type, `PolicyDefaultValidators`
     * unless given. A type absent here accepts no options.
     */
    validators?: PolicyValidators;
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
        this.attributesValidator = new PolicyAttributesValidator(ctx.validators);
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
            return { data: await redactUnreachedRelations(entities, parsed, policySchema, actor), meta };
        }

        const data: Policy[] = [];
        let { total } = meta;

        for (const entity of entities) {
            const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
                name: PERMISSION_NAMES,
                realm: entity.realmId,
                data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
            });

            if (!reached) {
                total -= 1;

                continue;
            }

            data.push(entity);
        }

        return {
            data: await redactUnreachedRelations(data, parsed, policySchema, actor),
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

        await evaluateRecordOneOf(actor.permissionEvaluator, {
            name: PERMISSION_NAMES,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
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

        let entity: Policy | null | undefined;

        if (idOrName) {
            const where: Record<string, any> = {};

            if (isUUID(idOrName)) {
                where.id = idOrName;
            } else {
                where.name = idOrName;
            }

            if (typeof data.realmId === 'string') {
                // A realm key that does not resolve is refused: dropping the
                // predicate would address a row of whichever realm holds the
                // name.
                const realm = await this.realmRepository.resolveOrFail(data.realmId);

                entity = await this.repository.findOneBy({ ...where, realmId: realm.id });
            } else {
                // No realm value means global on create, so a name key
                // without one addresses the global row. A UUID key names
                // one specific row and needs no realm.
                if (!where.id) {
                    where.realmId = null;
                }

                entity = await this.repository.findOneBy(where);
            }

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

            if (entity.builtIn) {
                throw new ValidationError('A built-in policy can not be updated.');
            }

            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validate(data, group, entity?.type);

        await this.repository.validateJoinColumns(validated);

        const parentId = validated.parentId ?? null;

        if (entity) {
            if (typeof validated.parentId !== 'undefined' && parentId !== (entity.parentId ?? null)) {
                if (parentId) {
                    await this.evaluateParent(actor, parentId, { loaded: validated.parent, attach: true });
                }

                if (entity.parentId) {
                    await this.evaluateParent(actor, entity.parentId);
                }
            }
        } else if (parentId) {
            await this.evaluateParent(actor, parentId, { loaded: validated.parent, attach: true });
        }

        if (
            validated.parent &&
            validated.parent.type !== BuiltInPolicyType.COMPOSITE
        ) {
            throw new ValidationError('The parent policy must be of type group.');
        }

        await this.evaluateChildren(actor, validated.children);

        if (entity) {
            await this.evaluateUpdate(
                actor,
                PermissionName.PERMISSION_UPDATE,
                { ...entity },
                { ...entity, ...validated },
                { realm: (row) => row.realmId },
            );

            await this.repository.checkUniqueness(validated, entity);

            extendObject(entity, validated);

            await this.repository.saveWithEA(entity);

            return {
                entity,
                created: false,
            };
        }

        validated.realmId = validated.realmId ?? null;

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.PERMISSION_CREATE,
            realm: validated.realmId ?? null,
            data: { [BuiltInPolicyType.ATTRIBUTES]: validated },
        });

        await this.repository.checkUniqueness(validated);

        entity = this.repository.create(validated);
        await this.repository.saveWithEA(entity);

        return {
            entity,
            created: true,
        };
    }

    /**
     * Attaching a child to a composite, detaching one or deleting one changes
     * the composite's expression, so it needs authority over the parent. The
     * authority is evaluated before the parent's type or built-in flag is
     * answered, so a caller without it learns only that the parent exists.
     * Only attaching is refused for a built-in parent: detaching a child from
     * one stays possible, so it can be cleaned up.
     */
    private async evaluateParent(
        actor: ActorContext,
        id: string,
        options: { loaded?: Policy | null, attach?: boolean } = {},
    ): Promise<void> {
        const parent = options.loaded ?? await this.repository.findOneBy({ id });

        if (!parent) {
            if (options.attach) {
                throw new ValidationError('The parent policy does not exist.');
            }

            return;
        }

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.PERMISSION_UPDATE,
            realm: parent.realmId ?? null,
            data: { [BuiltInPolicyType.ATTRIBUTES]: parent },
        });

        if (options.attach && parent.builtIn) {
            throw new ValidationError('A child can not be attached to a built-in policy.');
        }
    }

    private async evaluateChildren(
        actor: ActorContext,
        children?: Policy[],
    ): Promise<void> {
        if (!Array.isArray(children)) {
            return;
        }

        for (const child of children) {
            // a nested child's parent is the policy it is nested in
            delete (child as Partial<Policy>).parentId;
            child.realmId = child.realmId ?? null;

            await evaluateRecord(actor.permissionEvaluator, {
                name: PermissionName.PERMISSION_CREATE,
                realm: child.realmId,
                data: { [BuiltInPolicyType.ATTRIBUTES]: child },
            });

            await this.evaluateChildren(actor, child.children);
        }
    }

    private async validate(
        data: Record<string, any>,
        group: string,
        type?: string,
    ): Promise<Policy> {
        const validated = await this.validator.run(data, { group });

        // `type` is create-only, so an update reads its options by the stored type
        const resolvedType = type ?? data.type;
        const attributes = await this.attributesValidator.run({ ...data, type: resolvedType });

        extendObject(validated, attributes);

        // each child is a policy of its own: validated here, with its own type's validator
        if (Array.isArray(data.children)) {
            if (resolvedType === BuiltInPolicyType.COMPOSITE) {
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

        const { id: entityId } = entity;

        // The subtree is authorized outside the delete's transaction (#3526)
        // and read again under its lock; a child attached or changed in
        // between aborts the delete, which is then authorized again.
        const deleted = await retryOnStaleRow({
            row: entity,
            reread: () => this.repository.findOneBy({ id: entityId }),
        }, async (stored) => {
            if (stored.builtIn) {
                throw new ValidationError('A built-in policy can not be deleted.');
            }

            await evaluateRecord(actor.permissionEvaluator, {
                name: PermissionName.PERMISSION_DELETE,
                realm: stored.realmId,
                data: { [BuiltInPolicyType.ATTRIBUTES]: stored },
            });

            if (stored.parentId) {
                await this.evaluateParent(actor, stored.parentId);
            }

            // deleteFromTree removes the whole subtree, so every descendant is
            // a delete of its own, evaluated in its own realm
            const descendants = await this.repository.findDescendants(stored);

            for (const descendant of descendants) {
                await evaluateRecord(actor.permissionEvaluator, {
                    name: PermissionName.PERMISSION_DELETE,
                    realm: descendant.realmId ?? null,
                    data: { [BuiltInPolicyType.ATTRIBUTES]: descendant },
                });
            }

            const holdsBuiltIn = descendants.some((descendant) => descendant.builtIn);

            if (holdsBuiltIn) {
                throw new ValidationError('A policy holding a built-in policy can not be deleted.');
            }

            const before: Partial<Policy> = { ...stored };
            const evaluated = new Map(descendants.map((descendant) => [descendant.id, { ...descendant }]));

            await this.repository.transaction(async (repository) => {
                const current = await repository.findOneBy({ id: entityId });

                if (!current) {
                    throw new EntityNotFoundError();
                }

                assertRowUnchanged(before, current);

                const fresh = await repository.findDescendants(current);

                if (fresh.length !== evaluated.size) {
                    throw new StaleRowSignal();
                }

                for (const descendant of fresh) {
                    const snapshot = evaluated.get(descendant.id);

                    if (!snapshot) {
                        throw new StaleRowSignal();
                    }

                    assertRowUnchanged(snapshot, descendant);
                }

                await repository.deleteFromTree(current);
            });

            return stored;
        });

        deleted.id = entityId;

        // todo: remove after PolicyEntity - parent delete on cascade
        removeObjectProperty(deleted, 'children');

        return deleted;
    }
}
