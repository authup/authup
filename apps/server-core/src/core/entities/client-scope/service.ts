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
import { inArray } from '@rapiq/core';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { ClientScopeValidator, PermissionName } from '@authup/core-kit';
import type { ClientScope } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IClientScopeRepository, IClientScopeService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { clientScopeSchema } from './schema.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.CLIENT_SCOPE_READ,
    PermissionName.CLIENT_READ,
    PermissionName.CLIENT_UPDATE,
    PermissionName.CLIENT_DELETE,
];

export type ClientScopeServiceContext = {
    repository: IClientScopeRepository;
};

export class ClientScopeService extends JunctionEntityService implements IClientScopeService {
    protected readonly ownerRealmKey = 'clientRealmId';

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
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: clientScopeSchema, actor });

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
            return { data: entities, meta };
        }

        const data: ClientScope[] = [];
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

        return { data, meta: { ...meta, total } };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientScope> {
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
    ): Promise<ClientScope> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_SCOPE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            clientId: validated.clientId,
            scopeId: validated.scopeId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'client-scope' });
        }

        if (validated.client) {
            validated.clientRealmId = validated.client.realmId;
        }

        if (validated.scope) {
            validated.scopeRealmId = validated.scope.realmId;
        }

        // Stamp the owner (client) realm so the realmScope factor gates cross-realm writes.
        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_SCOPE_CREATE,
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
    ): Promise<ClientScope> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_SCOPE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Stamp the owner (client) realm so the realmScope factor gates cross-realm writes.
        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_SCOPE_DELETE,
            realm: this.junctionResourceRealm(entity),
            data: { [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) },
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
