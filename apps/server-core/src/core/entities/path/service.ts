/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { eq, inArray } from '@rapiq/core';
import { ValidatorGroup, isPropertySet } from '@authup/kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import {
    PathValidator,
    PermissionName,
} from '@authup/core-kit';
import type { Path } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';
import type { IPathRepository, IPathService, PathReadOptions } from './types.ts';
import { assertPathBounds, buildPathForParent } from './helpers.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { pathSchema } from './schema.ts';

export type PathServiceContext = {
    repository: IPathRepository;
    realmRepository: IRealmRepository;
};

const PERMISSION_NAMES = [
    PermissionName.PATH_READ,
    PermissionName.PATH_UPDATE,
    PermissionName.PATH_DELETE,
];

export class PathService extends AbstractEntityService implements IPathService {
    protected repository: IPathRepository;

    protected realmRepository: IRealmRepository;

    protected validator: PathValidator;

    constructor(ctx: PathServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new PathValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: PathReadOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Path>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        let parsed = await decodeQuery(query, {
            schema: pathSchema,
            actor,
        });

        if (options.realmId) {
            parsed = appendQueryConditions(parsed, eq('realmId', options.realmId));
        }

        // Compile the read permissions against the knowns (actor identity) into a
        // row condition (issue #3286 phase 3): the authorization runs as WHERE, so
        // pagination and totals stay exact. Non-expressible policies fall back to
        // the per-row post-evaluation below.
        const compiled = await actor.permissionEvaluator.compile({ name: PERMISSION_NAMES });
        if (compiled.verdict === 'deny') {
            // no row can pass — a constant-false condition keeps the meta shape
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        if (compiled.verdict !== 'post') {
            return {
                data: entities,
                meta,
            };
        }

        const data: Path[] = [];
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
        id: string,
        actor: ActorContext,
        realmKey?: string,
    ): Promise<Path> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        // a folder is addressed by id or by its FULL path: the repository's
        // name lookup matches `path`, never the single segment `name`
        const entity = await this.repository.findOneByIdOrName(id, realmKey);
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
    ): Promise<Path> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PATH_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        if (!isPropertySet(validated, 'realmId') || !validated.realmId) {
            const actorRealmId = this.getActorRealmId(actor);
            if (!actorRealmId) {
                throw new ValidationError('A path needs a realm.');
            }

            validated.realmId = actorRealmId;
        }

        const parent = await this.resolveParent(this.repository, validated.parentId ?? null, validated.realmId);
        // the validator omits an absent optional key, so a root folder is
        // stamped explicitly rather than left undefined: the created record
        // must read like a later fetch of the same row
        validated.parentId = parent ? parent.id : null;
        validated.path = buildPathForParent(parent, validated.name);
        assertPathBounds(validated.path);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PATH_CREATE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated, ...this.resourceRealmMatch(validated) }),
        });

        await this.repository.checkUniqueness(validated);

        const entity = this.repository.create(validated);
        return this.repository.save(entity);
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
        realmKey?: string,
    ): Promise<Path> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PATH_UPDATE });

        const entity = await this.repository.findOneByIdOrName(id, realmKey);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        // The gate and the uniqueness check run on the row as it reads now,
        // OUTSIDE the transaction: the evaluator's grant loads and
        // checkUniqueness each take a pooled connection of their own, and
        // holding one while a transaction pins another deadlocks the pool
        // under concurrency (issue #3526).
        const resolved = await this.resolveNextPath(this.repository, entity, validated);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PATH_UPDATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: {
                    ...entity,
                    ...validated,
                    path: resolved.path,
                },
                ...this.resourceRealmMatch(entity),
            }),
        });

        if (resolved.path !== entity.path) {
            await this.repository.checkUniqueness({
                path: resolved.path,
                realmId: entity.realmId,
            }, entity);
        }

        return this.repository.transaction(async (repository) => {
            // The row is re-read inside the transaction and everything the
            // write depends on is recomputed from it. Merging onto the copy
            // loaded above would write that copy's path back: a concurrent
            // rename of the same folder commits between the two reads, this
            // request derives its `nextPath` from the old name, sees no
            // change and rewrites no descendant, and the folder lands back at
            // its old path while its children stay under the new one.
            const current = await repository.findOneBy({ id: entity.id });
            if (!current) {
                throw new EntityNotFoundError();
            }

            const {
                name, 
                parentId, 
                path: nextPath, 
            } = await this.resolveNextPath(
                repository,
                current,
                validated,
            );

            const previousPath = current.path;
            const descendants = nextPath === previousPath ?
                [] :
                await repository.findDescendants(current);

            // every bound is asserted before the first write, so a descendant
            // whose new path is too long can not leave the subtree half
            // rewritten
            assertPathBounds(nextPath);
            const rewritten = descendants.map((descendant) => {
                const path = `${nextPath}${descendant.path.slice(previousPath.length)}`;
                assertPathBounds(path);

                return { descendant, path };
            });

            // Users and clients follow their folder by id and are not touched.
            for (const item of rewritten) {
                item.descendant.path = item.path;
                await repository.save(item.descendant);
            }

            const merged = repository.merge(current, {
                ...validated,
                name,
                parentId,
                path: nextPath,
            });

            return repository.save(merged);
        });
    }

    async delete(
        id: string,
        actor: ActorContext,
        realmKey?: string,
    ): Promise<Path> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PATH_DELETE });

        const entity = await this.repository.findOneByIdOrName(id, realmKey);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PATH_DELETE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    /**
     * The name, the parent and the derived path an update would write, read
     * through the repository it is given: the transaction hands over one bound
     * to itself, so the checks decide on the rows that write will see.
     */
    protected async resolveNextPath(
        repository: IPathRepository,
        entity: Path,
        validated: Record<string, any>,
    ): Promise<{
        name: string, 
        parentId: string | null, 
        path: string 
    }> {
        const name = validated.name ?? entity.name;
        const parentId = isPropertySet(validated, 'parentId') ?
            (validated.parentId ?? null) :
            entity.parentId;

        const parent = await this.resolveParent(repository, parentId, entity.realmId);
        if (
            parent &&
            (
                parent.id === entity.id ||
                parent.path === entity.path ||
                parent.path.startsWith(`${entity.path}/`)
            )
        ) {
            throw new ValidationError('A path can not be moved under itself.');
        }

        return {
            name,
            parentId,
            path: buildPathForParent(parent, name),
        };
    }

    protected async resolveParent(
        repository: IPathRepository,
        parentId: string | null,
        realmId: string,
    ): Promise<Path | null> {
        if (!parentId) {
            return null;
        }

        const parent = await repository.findOneById(parentId);
        if (!parent) {
            throw new ValidationError('The parent path does not exist.');
        }

        if (parent.realmId !== realmId) {
            throw new ValidationError('The parent path belongs to another realm.');
        }

        return parent;
    }
}
