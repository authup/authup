/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    PermissionError,
    evaluateRecord,
    evaluateRecordOneOf,
    hasUnboundedReach,
    reachesRecordOneOf,
} from '@authup/access';
import {
    ClientTokenExchangeCapabilityValidator,
    ClientTokenExchangeRealmScope,
    PermissionName,
} from '@authup/core-kit';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { inArray } from '@rapiq/core';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import { appendQueryConditions, decodeQuery, redactUnreachedRelations } from '../../query/index.ts';
import { assertRowUnchanged, retryOnStaleRow } from '../stale-row/index.ts';
import { clientTokenExchangeCapabilitySchema } from './schema.ts';
import type { IClientTokenExchangeCapabilityRepository, IClientTokenExchangeCapabilityService } from './types.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_READ,
    PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE,
    PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_DELETE,
];

export type ClientTokenExchangeCapabilityServiceContext = {
    repository: IClientTokenExchangeCapabilityRepository;
};

export class ClientTokenExchangeCapabilityService extends AbstractEntityService implements IClientTokenExchangeCapabilityService {
    protected repository: IClientTokenExchangeCapabilityRepository;

    protected validator: ClientTokenExchangeCapabilityValidator;

    constructor(ctx: ClientTokenExchangeCapabilityServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new ClientTokenExchangeCapabilityValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientTokenExchangeCapability>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: clientTokenExchangeCapabilitySchema, actor });

        const compiled = await actor.permissionEvaluator.compile({ name: READ_PERMISSION_NAMES });

        if (compiled.verdict === 'deny') {
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        if (compiled.verdict !== 'post') {
            return { data: await redactUnreachedRelations(entities, parsed, clientTokenExchangeCapabilitySchema, actor), meta };
        }

        const data: ClientTokenExchangeCapability[] = [];
        let { total } = meta;

        for (const entity of entities) {
            const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
                name: READ_PERMISSION_NAMES,
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
            data: await redactUnreachedRelations(data, parsed, clientTokenExchangeCapabilitySchema, actor),
            meta: { ...meta, total },
        };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientTokenExchangeCapability> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecordOneOf(actor.permissionEvaluator, {
            name: READ_PERMISSION_NAMES,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<ClientTokenExchangeCapability> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        if (!validated.client) {
            throw new EntityNotFoundError();
        }

        const entity = this.repository.create({
            clientId: validated.clientId,
            audience: validated.audience,
            value: validated.value,
            tokenMaxAge: validated.tokenMaxAge,
            realmScope: validated.realmScope ?? ClientTokenExchangeRealmScope.OWN,
            realmId: validated.client.realmId,
        });

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_CREATE,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: { ...entity } },
        });

        await this.assertSubjectRealmReach(actor, PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_CREATE, entity);

        await this.repository.checkUniqueness(entity);

        return this.repository.save(entity);
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<ClientTokenExchangeCapability> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        // A field echoed back with the value this request read is no intent
        // to change it (the console posts its whole form).
        const patch : Partial<ClientTokenExchangeCapability> = { ...validated };

        for (const key of Object.keys(patch) as (keyof ClientTokenExchangeCapability)[]) {
            if (patch[key] === entity[key]) {
                delete patch[key];
            }
        }

        // Only the write runs inside the transaction, since the evaluator and
        // uniqueness reads each take a pooled connection of their own (#3526).
        // A locked row that differs from the one authorized aborts the write,
        // so a narrowing a concurrent update committed is never written back.
        return retryOnStaleRow({
            row: entity,
            reread: () => this.repository.findOneBy({ id }),
        }, async (stored) => {
            const before = { ...stored };
            const next = this.repository.merge(stored, patch);

            await this.evaluateUpdate(
                actor,
                PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE,
                before,
                { ...next },
                { realm: (row) => row.realmId },
            );

            await this.assertSubjectRealmReach(actor, PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE, next);

            await this.repository.checkUniqueness(patch, before);

            return this.repository.transaction(async (repository) => {
                const current = await repository.findOneBy({ id });

                if (!current) {
                    throw new EntityNotFoundError();
                }

                assertRowUnchanged(before, current);

                return repository.save(repository.merge(current, patch));
            });
        });
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientTokenExchangeCapability> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_DELETE });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_DELETE,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    /**
     * A capability of realm scope `any` acts on subjects of every realm, so the grant
     * writing it has to reach every realm. A policy-narrowed `any` grant reads
     * as not reaching them, the fail-closed answer for this root of trust.
     */
    protected async assertSubjectRealmReach(
        actor: ActorContext,
        name: PermissionName,
        entity: ClientTokenExchangeCapability,
    ) : Promise<void> {
        if (entity.realmScope !== ClientTokenExchangeRealmScope.ANY) {
            return;
        }

        if (!await hasUnboundedReach(actor.permissionEvaluator, name)) {
            throw PermissionError.denied(name);
        }
    }
}
