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
    ClientTokenExchangePolicyValidator,
    ClientTokenExchangeSubjectRealmScope,
    PermissionName,
} from '@authup/core-kit';
import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { inArray } from '@rapiq/core';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import { appendQueryConditions, decodeQuery, redactUnreachedRelations } from '../../query/index.ts';
import { assertRowUnchanged, retryOnStaleRow } from '../stale-row/index.ts';
import { clientTokenExchangePolicySchema } from './schema.ts';
import type { IClientTokenExchangePolicyRepository, IClientTokenExchangePolicyService } from './types.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ,
    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE,
    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE,
];

export type ClientTokenExchangePolicyServiceContext = {
    repository: IClientTokenExchangePolicyRepository;
};

export class ClientTokenExchangePolicyService extends AbstractEntityService implements IClientTokenExchangePolicyService {
    protected repository: IClientTokenExchangePolicyRepository;

    protected validator: ClientTokenExchangePolicyValidator;

    constructor(ctx: ClientTokenExchangePolicyServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new ClientTokenExchangePolicyValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientTokenExchangePolicy>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: clientTokenExchangePolicySchema, actor });

        const compiled = await actor.permissionEvaluator.compile({ name: READ_PERMISSION_NAMES });

        if (compiled.verdict === 'deny') {
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        if (compiled.verdict !== 'post') {
            return { data: await redactUnreachedRelations(entities, parsed, clientTokenExchangePolicySchema, actor), meta };
        }

        const data: ClientTokenExchangePolicy[] = [];
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
            data: await redactUnreachedRelations(data, parsed, clientTokenExchangePolicySchema, actor),
            meta: { ...meta, total },
        };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientTokenExchangePolicy> {
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
    ): Promise<ClientTokenExchangePolicy> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        if (!validated.client) {
            throw new EntityNotFoundError();
        }

        const entity = this.repository.create({
            clientId: validated.clientId,
            audience: validated.audience,
            capabilityTypes: validated.capabilityTypes,
            maxLifetime: validated.maxLifetime,
            subjectRealmScope: validated.subjectRealmScope ?? ClientTokenExchangeSubjectRealmScope.OWN,
            realmId: validated.client.realmId,
        });

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_CREATE,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: { ...entity } },
        });

        await this.assertSubjectRealmReach(actor, PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_CREATE, entity);

        await this.repository.checkUniqueness(entity);

        return this.repository.save(entity);
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<ClientTokenExchangePolicy> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        // A field echoed back with the value this request read is no intent
        // to change it (the console posts its whole form).
        const patch : Partial<ClientTokenExchangePolicy> = { ...validated };

        for (const key of Object.keys(patch) as (keyof ClientTokenExchangePolicy)[]) {
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
                PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE,
                before,
                { ...next },
                { realm: (row) => row.realmId },
            );

            await this.assertSubjectRealmReach(actor, PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE, next);

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
    ): Promise<ClientTokenExchangePolicy> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE });

        const entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    /**
     * A policy of scope `any` acts on subjects of every realm, so the grant
     * writing it has to reach every realm. A policy-narrowed `any` grant reads
     * as not reaching them, the fail-closed answer for this root of trust.
     */
    protected async assertSubjectRealmReach(
        actor: ActorContext,
        name: PermissionName,
        entity: ClientTokenExchangePolicy,
    ) : Promise<void> {
        if (entity.subjectRealmScope !== ClientTokenExchangeSubjectRealmScope.ANY) {
            return;
        }

        if (!await hasUnboundedReach(actor.permissionEvaluator, name)) {
            throw PermissionError.denied(name);
        }
    }
}
