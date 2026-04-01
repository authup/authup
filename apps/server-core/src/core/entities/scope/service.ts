/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { isPropertySet, isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import {
    PermissionName,
    ScopeValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Scope } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IScopeRepository, IScopeService } from './types.ts';

export type ScopeServiceContext = {
    repository: IScopeRepository;
    realmRepository: IRealmRepository;
};

export class ScopeService extends AbstractEntityService implements IScopeService {
    protected repository: IScopeRepository;

    protected realmRepository: IRealmRepository;

    protected validator: ScopeValidator;

    constructor(ctx: ScopeServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new ScopeValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Scope>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.SCOPE_READ,
                PermissionName.SCOPE_UPDATE,
                PermissionName.SCOPE_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
    ): Promise<Scope> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.SCOPE_READ,
                PermissionName.SCOPE_UPDATE,
                PermissionName.SCOPE_DELETE,
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
    ): Promise<Scope> {
        const {
            entity 
        } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Scope> {
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
        entity: Scope,
        created: boolean 
    }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
            undefined;

        let entity: Scope | null | undefined;
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
            await actor.permissionEvaluator.preEvaluate({
                name: PermissionName.SCOPE_UPDATE 
            });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({
                name: PermissionName.SCOPE_CREATE 
            });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, {
            group 
        });

        await this.repository.validateJoinColumns(validated);

        if (entity) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.SCOPE_UPDATE,
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

            return {
                entity,
                created: false 
            };
        }

        if (!isPropertySet(validated, 'realm_id') && actor.identity) {
            validated.realm_id = this.getActorRealmId(actor) || null;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.SCOPE_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
            }),
        });

        await this.repository.checkUniqueness(validated);

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
    ): Promise<Scope> {
        await actor.permissionEvaluator.preEvaluate({
            name: PermissionName.SCOPE_DELETE 
        });

        const entity = await this.repository.findOneBy({
            id 
        });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.SCOPE_DELETE,
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
