/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { isPropertySet, isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    PermissionValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Permission } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IPermissionRepository, IPermissionService } from './types.ts';

export type PermissionServiceContext = {
    repository: IPermissionRepository;
    realmRepository: IRealmRepository;
};

export class PermissionService extends AbstractEntityService implements IPermissionService {
    protected repository: IPermissionRepository;

    protected realmRepository: IRealmRepository;

    protected validator: PermissionValidator;

    constructor(ctx: PermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new PermissionValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Permission>> {
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
    ): Promise<Permission> {
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
    ): Promise<Permission> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Permission> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{ entity: Permission, created: boolean }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
            undefined;

        let entity: Permission | null | undefined;
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

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        if (entity) {
            if (
                entity.built_in &&
                isPropertySet(validated, 'name') &&
                entity.name !== validated.name
            ) {
                throw new BadRequestError('The name of a built-in permission can not be changed.');
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

            await this.repository.checkUniqueness(validated, entity);

            entity = this.repository.merge(entity, validated);

            await this.repository.save(entity);

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

        await this.repository.checkUniqueness(validated);

        entity = this.repository.create(validated);

        await this.repository.saveWithAdminRoleAssignment(entity);

        return { entity, created: true };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Permission> {
        await actor.permissionChecker.preCheck({ name: PermissionName.PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        if (entity.built_in) {
            throw new BadRequestError('A built-in permission can not be deleted.');
        }

        await actor.permissionChecker.check({
            name: PermissionName.PERMISSION_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
