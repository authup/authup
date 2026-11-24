/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    appendQueryConditions,
    evaluateRecord,
    evaluateRecordOneOf,
    reachesRecordOneOf,
} from '@authup/access';
import { inArray } from '@rapiq/core';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { ClientPermissionValidator, PermissionName } from '@authup/core-kit';
import type { ClientPermission, Permission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import { authorizePermissionJunctionCreate, authorizePermissionJunctionUpdate } from '../../identity/permission/junction-grant.ts';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import { loadJunctionOwners, readJunctionOwner } from '../junction-owner/index.ts';
import type { JunctionDefinition, JunctionOwners } from '../junction-owner/index.ts';
import type { IClientPermissionRepository, IClientPermissionService } from './types.ts';
import {
    decodeQuery,
    readResponseAttributeNames,
    redactUnreachedRelations,
    widenSparseRootProjection,
} from '../../query/index.ts';
import { clientPermissionSchema } from './schema.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.CLIENT_PERMISSION_CREATE,
    PermissionName.CLIENT_PERMISSION_DELETE,
];

export type ClientPermissionServiceContext = {
    repository: IClientPermissionRepository;
    permissionRepository: IEntityRepository<Permission>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class ClientPermissionService extends JunctionEntityService implements IClientPermissionService {
    protected readonly ownerRealm = { key: 'clientRealmId' } as const;

    protected readonly definition: JunctionDefinition;

    protected repository: IClientPermissionRepository;

    protected permissionRepository: IEntityRepository<Permission>;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: ClientPermissionValidator;

    constructor(ctx: ClientPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.definition = {
            key: 'permissionId', 
            relation: 'permission', 
            repository: ctx.permissionRepository, 
        };
        this.permissionRepository = ctx.permissionRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new ClientPermissionValidator();
    }

    protected junctionOwner(row: Record<string, any>, owners?: JunctionOwners): string | null {
        return readJunctionOwner(row, this.definition, owners);
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientPermission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: clientPermissionSchema, actor });

        // The realm reach of the grant, compiled into a row condition and lowered onto
        // the OWNER realm key — a junction row carries no `realmId` (issue #3594).
        const compiled = await actor.permissionEvaluator.compile({
            name: READ_PERMISSION_NAMES,
            realmAttributeName: this.ownerRealm.key,
        });

        if (compiled.verdict === 'deny') {
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        } else if (compiled.verdict === 'post') {
            // the rows are evaluated one by one, each on its whole default row
            parsed = widenSparseRootProjection(parsed, clientPermissionSchema, [this.ownerRealm.key]);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        if (compiled.verdict !== 'post') {
            return { data: await redactUnreachedRelations(entities, parsed, clientPermissionSchema, actor), meta };
        }

        const owners = await loadJunctionOwners(entities, this.definition);

        const data: ClientPermission[] = [];

        for (const entity of entities) {
            const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
                name: READ_PERMISSION_NAMES,
                realm: this.junctionResourceRealm(entity),
                owner: this.junctionOwner(entity, owners),
                data: {
                    [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                    [BuiltInPolicyType.ATTRIBUTE_NAMES]: readResponseAttributeNames(entity, parsed),
                },
            });

            if (!reached) {
                continue;
            }

            data.push(entity);
        }

        return { data: await redactUnreachedRelations(data, parsed, clientPermissionSchema, actor), meta };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecordOneOf(actor.permissionEvaluator, {
            name: READ_PERMISSION_NAMES,
            realm: this.junctionResourceRealm(entity),
            owner: this.junctionOwner(entity, await loadJunctionOwners([entity], this.definition)),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
        });

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
            clientId: validated.clientId,
            permissionId: validated.permissionId,
        });

        if (existing) {
            throw new EntityConflictError({ entity: 'client-permission' });
        }

        if (validated.permission) {
            validated.permissionRealmId = validated.permission.realmId;

            await authorizePermissionJunctionCreate({
                provider: this.identityPermissionProvider,
                actor,
                permission: validated.permission,
            }, validated);
        }

        if (validated.client) {
            validated.clientRealmId = validated.client.realmId;
        }

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_PERMISSION_CREATE,
            realm: this.junctionResourceRealm(validated),
            owner: this.junctionOwner(validated),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated) },
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
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        const permission = await this.permissionRepository.findOneById(entity.permissionId);

        const updateData = await authorizePermissionJunctionUpdate({
            provider: this.identityPermissionProvider,
            actor,
            permission,
        }, validated, entity.realmScope);

        await this.repository.validateJoinColumns(updateData);

        const current = this.junctionAttributes(entity);
        const merged = this.repository.merge(entity, updateData);

        await this.evaluateUpdate(
            actor,
            PermissionName.CLIENT_PERMISSION_UPDATE,
            current,
            this.junctionAttributes(merged),
            {
                realm: (row) => this.junctionResourceRealm(row),
                owner: () => permission?.clientId ?? null,
            },
        );

        return this.repository.save(merged);
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_PERMISSION_DELETE,
            realm: this.junctionResourceRealm(entity),
            owner: this.junctionOwner(entity, await loadJunctionOwners([entity], this.definition)),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
