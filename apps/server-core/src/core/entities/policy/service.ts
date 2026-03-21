/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { extendObject, isUUID, removeObjectProperty } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    PolicyValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Policy } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import { PolicyAttributesValidator } from './attributes-validator.ts';
import type { IPolicyRepository, IPolicyService } from './types.ts';

export type PolicyServiceContext = {
    repository: IPolicyRepository;
    realmRepository: IRealmRepository;
};

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

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Policy>> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
        realm?: string,
    ): Promise<Policy> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        });

        const entity = await this.repository.findOneByIdOrName(idOrName, realm);
        if (!entity) {
            throw new NotFoundError();
        }

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
    ): Promise<{ entity: Policy, created: boolean }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
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
                where.realm_id = realm.id;
            }

            entity = await this.repository.findOneBy(where);
            if (!entity && options.updateOnly) {
                throw new NotFoundError();
            }
        } else if (options.updateOnly) {
            throw new NotFoundError();
        }

        if (entity) {
            await actor.permissionChecker.preCheck({ name: PermissionName.PERMISSION_UPDATE });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionChecker.preCheck({ name: PermissionName.PERMISSION_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validate(data, group);

        await this.repository.validateJoinColumns(validated);

        if (
            validated.parent &&
            validated.parent.type !== BuiltInPolicyType.COMPOSITE
        ) {
            throw new BadRequestError('The parent policy must be of type group.');
        }

        await this.repository.checkUniqueness(validated, entity || undefined);

        if (entity) {
            if (entity.built_in) {
                throw new BadRequestError('A built-in policy can not be updated.');
            }

            await actor.permissionChecker.check({
                name: PermissionName.PERMISSION_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...validated,
                    },
                }),
            });

            extendObject(entity, validated);

            await this.repository.saveWithEA(entity);

            return { entity, created: false };
        }

        if (!validated.realm_id && actor.identity) {
            validated.realm_id = this.getActorRealmId(actor) || null;
        }

        await actor.permissionChecker.check({
            name: PermissionName.PERMISSION_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
            }),
        });

        await this.repository.saveWithEA(validated as Policy);

        return { entity: validated as Policy, created: true };
    }

    private async validate(
        data: Record<string, any>,
        group: string,
    ): Promise<Record<string, any>> {
        const validated = await this.validator.run(data, { group });

        const attributes = await this.attributesValidator.run(data);
        extendObject(validated, attributes);

        if (Array.isArray(data.children)) {
            if (data.type === BuiltInPolicyType.COMPOSITE) {
                const promises = data.children.map(
                    (child: Record<string, any>) => this.validate(child, group),
                );
                validated.children = await Promise.all(promises) as Policy['children'];
            }
        }

        return validated;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Policy> {
        await actor.permissionChecker.preCheck({ name: PermissionName.PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        if (entity.built_in) {
            throw new BadRequestError('A built-in policy can not be deleted.');
        }

        await actor.permissionChecker.check({
            name: PermissionName.PERMISSION_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;

        await this.repository.deleteFromTree(entity);

        entity.id = entityId;

        // todo: remove after PolicyEntity - parent delete on cascade
        removeObjectProperty(entity, 'children');

        return entity;
    }
}
