/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    ROLE_ADMIN_NAME,
    RoleValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Role } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IRoleRepository, IRoleService } from './types.ts';

export type RoleServiceContext = {
    repository: IRoleRepository;
    realmRepository: IRealmRepository;
};

export class RoleService extends AbstractEntityService implements IRoleService {
    protected repository: IRoleRepository;

    protected realmRepository: IRealmRepository;

    protected validator: RoleValidator;

    constructor(ctx: RoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new RoleValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Role>> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
    ): Promise<Role> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
        });

        const entity = await this.repository.findOneByIdOrName(idOrName);
        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Role> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Role> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{ entity: Role, created: boolean }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
            undefined;

        let entity: Role | null | undefined;
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
            await actor.permissionChecker.preCheck({ name: PermissionName.ROLE_UPDATE });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionChecker.preCheck({ name: PermissionName.ROLE_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        if (entity) {
            await actor.permissionChecker.check({
                name: PermissionName.ROLE_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...validated,
                    },
                }),
            });

            entity = this.repository.merge(entity, validated);
            await this.repository.checkUniqueness(validated, entity);
            await this.repository.save(entity);

            return { entity, created: false };
        }

        if (!validated.realm_id && actor.identity) {
            const isMasterRealmMember = this.isActorMasterRealmMember(actor);
            if (!isMasterRealmMember) {
                validated.realm_id = this.getActorRealmId(actor) || null;
            }
        }

        await actor.permissionChecker.check({
            name: PermissionName.ROLE_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
            }),
        });

        await this.repository.checkUniqueness(validated);

        entity = this.repository.create(validated);
        await this.repository.save(entity);

        return { entity, created: true };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Role> {
        await actor.permissionChecker.preCheck({ name: PermissionName.ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        if (entity.name === ROLE_ADMIN_NAME) {
            throw new BadRequestError('The default admin role can not be deleted.');
        }

        await actor.permissionChecker.check({
            name: PermissionName.ROLE_DELETE,
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
