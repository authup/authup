/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import type { TrustAnchor } from '@authup/core-kit';
import { PermissionName, TrustAnchorValidator } from '@authup/core-kit';
import { BadRequestError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import { parseCertificateChain } from '../../key/index.ts';
import type { ITrustAnchorRepository, ITrustAnchorService } from './types.ts';

export type TrustAnchorServiceContext = {
    repository: ITrustAnchorRepository,
};

const PERMISSION_NAMES = [
    PermissionName.KEY_READ,
    PermissionName.KEY_UPDATE,
    PermissionName.KEY_DELETE,
];

export class TrustAnchorService extends AbstractEntityService implements ITrustAnchorService {
    protected repository: ITrustAnchorRepository;

    protected validator: TrustAnchorValidator;

    constructor(ctx: TrustAnchorServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new TrustAnchorValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<TrustAnchor>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const { data: entities, meta } = await this.repository.findMany(query);

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

        if (!validated.realm_id && actor.identity) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realm_id = actorRealmId;
            }
        }

        if (!validated.realm_id) {
            throw new BadRequestError('A realm must be specified.');
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
            throw new BadRequestError('A trust anchor must contain a CA certificate.');
        }

        if (typeof validated.enabled !== 'boolean') {
            validated.enabled = true;
        }

        const entity = this.repository.create(validated);
        return this.repository.save(entity);
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
                realm_id: entity.realm_id,
            }, entity);
        }

        entity = this.repository.merge(entity, validated);
        return this.repository.save(entity);
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

        return entity;
    }
}
