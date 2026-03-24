/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { isUUID, removeObjectProperty } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    UserValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { User } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import { UserCredentialsService } from '../../authentication/credential/entities/user/module.ts';
import type { IUserRepository, IUserService } from './types.ts';

export type UserServiceContext = {
    repository: IUserRepository;
    realmRepository: IRealmRepository;
};

export class UserService extends AbstractEntityService implements IUserService {
    protected repository: IUserRepository;

    protected realmRepository: IRealmRepository;

    protected validator: UserValidator;

    constructor(ctx: UserServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new UserValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<User>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_READ,
                PermissionName.USER_UPDATE,
                PermissionName.USER_DELETE,
            ],
        });

        const { data: entities, meta } = await this.repository.findMany(query);

        const data: User[] = [];
        let { total } = meta;

        for (const entity of entities) {
            if (
                actor.identity &&
                actor.identity.type === 'user' &&
                actor.identity.data.id === entity.id
            ) {
                data.push(entity);
                continue;
            }

            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: [
                        PermissionName.USER_READ,
                        PermissionName.USER_UPDATE,
                        PermissionName.USER_DELETE,
                    ],
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                    }),
                });

                data.push(entity);
            } catch {
                total -= 1;
            }
        }

        return { data, meta: { ...meta, total } };
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
        query?: Record<string, any>,
        realmId?: string,
    ): Promise<User> {
        let isMe = false;
        if (actor.identity && actor.identity.type === 'user') {
            if (
                actor.identity.data.id === idOrName ||
                actor.identity.data.name === idOrName
            ) {
                isMe = true;
            }
        }

        if (!isMe) {
            await actor.permissionEvaluator.preEvaluateOneOf({
                name: [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
            });
        }

        const resolvedId = isMe ? actor.identity!.data.id : idOrName;
        const entity = await this.repository.findOne(resolvedId, query, realmId);
        if (!entity) {
            throw new NotFoundError();
        }

        if (!isMe) {
            await actor.permissionEvaluator.evaluateOneOf({
                name: [
                    PermissionName.USER_READ,
                    PermissionName.USER_UPDATE,
                    PermissionName.USER_DELETE,
                ],
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<User> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<User> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{ entity: User, created: boolean }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
            undefined;

        let entity: User | null | undefined;
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

        let hasAbility: boolean | undefined;
        if (entity) {
            try {
                await actor.permissionEvaluator.preEvaluate({
                    name: PermissionName.USER_UPDATE,
                });
                hasAbility = true;
            } catch (e) {
                if (
                    !actor.identity ||
                    actor.identity.type !== 'user' ||
                    actor.identity.data.id !== entity.id
                ) {
                    throw e;
                }
            }

            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({
                name: PermissionName.USER_CREATE,
            });
            hasAbility = true;

            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        if (!hasAbility) {
            removeObjectProperty(validated, 'name_locked');
            removeObjectProperty(validated, 'active');
            removeObjectProperty(validated, 'status');
            removeObjectProperty(validated, 'status_message');
        }

        const credentialsService = new UserCredentialsService();

        if (entity) {
            const originalName = entity.name;
            const originalNameLocked = entity.name_locked;

            entity = this.repository.merge(entity, validated);

            if (
                validated.name &&
                validated.name !== originalName
            ) {
                if (validated.name_locked) {
                    entity.name_locked = validated.name_locked;
                }

                if (originalNameLocked && validated.name_locked !== false) {
                    entity.name = originalName;
                }
            }

            if (hasAbility) {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.USER_UPDATE,
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: {
                            ...entity,
                            ...validated,
                        },
                    }),
                });
            }

            if (validated.password) {
                entity.password = await credentialsService.protect(validated.password);
            }

            await this.repository.save(entity);

            return { entity, created: false };
        }

        if (!validated.realm_id) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realm_id = actorRealmId;
            }
        }

        entity = this.repository.create(validated);

        if (hasAbility) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_CREATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });
        }

        if (validated.password) {
            entity.password = await credentialsService.protect(validated.password);
        }

        await this.repository.save(entity);

        return { entity, created: true };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<User> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_DELETE });

        if (
            actor.identity &&
            actor.identity.type === 'user' &&
            actor.identity.data.id === id
        ) {
            throw new BadRequestError('The own user can not be deleted.');
        }

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_DELETE,
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
