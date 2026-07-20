/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import type { TrustAnchor } from '@authup/core-kit';
import {
    EntityType,
    EventName,
    EventScope,
    PermissionName,
    TrustAnchorValidator,
} from '@authup/core-kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import { buildEntityDiff } from '../event/index.ts';
import type { EventRequestContext, IEventService } from '../event/index.ts';
import { parseCertificateChain } from '../../key/index.ts';
import type { ITrustAnchorRepository, ITrustAnchorService } from './types.ts';
import { decodeQuery } from '../../query/index.ts';
import { trustAnchorSchema } from './schema.ts';

export type TrustAnchorServiceContext = {
    repository: ITrustAnchorRepository,
    eventService?: IEventService,
    requestContext?: () => EventRequestContext | undefined,
};

const PERMISSION_NAMES = [
    PermissionName.KEY_READ,
    PermissionName.KEY_UPDATE,
    PermissionName.KEY_DELETE,
];

export class TrustAnchorService extends AbstractEntityService implements ITrustAnchorService {
    protected repository: ITrustAnchorRepository;

    protected validator: TrustAnchorValidator;

    protected eventService?: IEventService;

    protected requestContext?: () => EventRequestContext | undefined;

    constructor(ctx: TrustAnchorServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new TrustAnchorValidator();
        this.eventService = ctx.eventService;
        this.requestContext = ctx.requestContext;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<TrustAnchor>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const { data: entities, meta } = await this.repository.findMany(decodeQuery(query, { schema: trustAnchorSchema }));

        const data: TrustAnchor[] = [];
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
        realmId?: string,
    ): Promise<TrustAnchor> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const entity = await this.repository.findOneByIdOrName(idOrName, realmId);
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
    ): Promise<TrustAnchor> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.KEY_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        if (!validated.realmId && actor.identity) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realmId = actorRealmId;
            }
        }

        if (!validated.realmId) {
            throw new ValidationError('A realm must be specified.');
        }

        await this.repository.validateJoinColumns(validated);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.KEY_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
                ...this.resourceRealmMatch(validated),
            }),
        });

        await this.repository.checkUniqueness(validated);

        const chain = parseCertificateChain(validated.certificate as string);
        if (!chain[0] || !chain[0].ca) {
            throw new ValidationError('A trust anchor must contain a CA certificate.');
        }

        if (typeof validated.enabled !== 'boolean') {
            validated.enabled = true;
        }

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        await this.recordEvent(EventName.CREATED, entity, actor);

        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realmId?: string,
    ): Promise<TrustAnchor> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.KEY_UPDATE });

        let entity = await this.repository.findOneByIdOrName(idOrName, realmId);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.KEY_UPDATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: {
                    ...entity,
                    ...validated,
                },
                ...this.resourceRealmMatch(entity),
            }),
        });

        if (validated.name && validated.name !== entity.name) {
            await this.repository.checkUniqueness({
                name: validated.name,
                realmId: entity.realmId,
            }, entity);
        }

        const previous = this.pickAuditFields(entity);

        entity = this.repository.merge(entity, validated);
        entity = await this.repository.save(entity);

        const diff = buildEntityDiff(this.pickAuditFields(entity), previous);
        await this.recordEvent(EventName.UPDATED, entity, actor, { ...(Object.keys(diff).length > 0 ? { diff } : {}) });

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<TrustAnchor> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.KEY_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.KEY_DELETE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
                ...this.resourceRealmMatch(entity),
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        await this.recordEvent(EventName.DELETED, entity, actor);

        return entity;
    }

    // ------------------------------------------------------------------

    /**
     * Metadata-only audit trail for trust-anchor lifecycle operations
     * (issue #3269) — trust anchors have no entity subscriber, so the
     * security-relevant mutations (an enabled CA anchor turns on mTLS client
     * auth for a realm) are recorded explicitly. The payload never carries
     * certificate bytes.
     */
    protected async recordEvent(
        name: `${EventName}`,
        entity: TrustAnchor,
        actor: ActorContext,
        data: Record<string, any> = {},
    ): Promise<void> {
        const requestContext = this.requestContext ?
            this.requestContext() :
            undefined;

        await this.eventService?.record({
            scope: EventScope.ENTITY,
            name,
            refType: EntityType.TRUST_ANCHOR,
            refId: entity.id,
            realmId: entity.realmId ?? null,
            actorType: actor.identity?.type ?? null,
            actorId: actor.identity?.data.id ?? null,
            actorName: actor.identity?.data.name ?? null,
            requestPath: requestContext?.requestPath ?? null,
            requestMethod: requestContext?.requestMethod ?? null,
            requestIpAddress: requestContext?.requestIpAddress ?? null,
            requestUserAgent: requestContext?.requestUserAgent ?? null,
            data: {
                name: entity.name,
                enabled: entity.enabled,
                ...data,
            },
        });
    }

    protected pickAuditFields(entity: TrustAnchor): Record<string, any> {
        return {
            name: entity.name,
            enabled: entity.enabled,
        };
    }
}
