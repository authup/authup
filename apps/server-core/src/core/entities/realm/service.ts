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
    REALM_MASTER_NAME,
    RealmValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Realm } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IRealmRepository, IRealmService } from './types.ts';

export type RealmServiceContext = {
    repository: IRealmRepository;
};

export class RealmService extends AbstractEntityService implements IRealmService {
    protected repository: IRealmRepository;

    protected validator: RealmValidator;

    constructor(ctx: RealmServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new RealmValidator();
    }

    async getMany(
        query: Record<string, any>,
    ): Promise<EntityRepositoryFindManyResult<Realm>> {
        return this.repository.findMany(query);
    }

    async getOne(
        idOrName: string,
    ): Promise<Realm> {
        const entity = await this.repository.findOneByIdOrName(idOrName);
        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Realm> {
        const {
            entity 
        } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Realm> {
        const {
            entity 
        } = await this.save(idOrName, data, actor, {
            updateOnly: true 
        });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{
        entity: Realm,
        created: boolean 
    }> {
        let group: string;

        let entity: Realm | null | undefined;
        if (idOrName) {
            const where: Record<string, any> = {};
            if (isUUID(idOrName)) {
                where.id = idOrName;
            } else {
                where.name = idOrName;
            }

            entity = await this.repository.findOneBy(where);
            if (!entity && options.updateOnly) {
                throw new NotFoundError();
            }
        } else if (options.updateOnly) {
            throw new NotFoundError();
        }

        if (entity) {
            await actor.permissionEvaluator.preEvaluate({
                name: PermissionName.REALM_UPDATE 
            });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({
                name: PermissionName.REALM_CREATE 
            });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, {
            group 
        });

        await this.repository.validateJoinColumns(validated);

        if (entity) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.REALM_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...validated,
                    },
                }),
            });

            if (entity.name === REALM_MASTER_NAME && isPropertySet(validated, 'name') && entity.name !== validated.name) {
                throw new BadRequestError(`The name of the ${REALM_MASTER_NAME} can not be changed.`);
            }

            entity = this.repository.merge(entity, validated);
            await this.repository.save(entity);

            return {
                entity,
                created: false 
            };
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.REALM_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
            }),
        });

        entity = this.repository.create(validated);
        await this.repository.save(entity);

        return {
            entity,
            created: true 
        };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Realm> {
        await actor.permissionEvaluator.preEvaluate({
            name: PermissionName.REALM_DELETE 
        });

        const entity = await this.repository.findOneBy({
            id 
        });
        if (!entity) {
            throw new NotFoundError();
        }

        if (entity.built_in) {
            throw new BadRequestError('A built-in realm can not be deleted.');
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.REALM_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const {
            id: entityId 
        } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
