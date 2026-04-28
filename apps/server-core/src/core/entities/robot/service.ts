/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import {
    PermissionName,
    RobotValidator,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Robot } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import { RobotCredentialsService } from '../../authentication/credential/entities/robot/module.ts';
import type { IRobotRepository, IRobotService } from './types.ts';

export type RobotServiceContext = {
    repository: IRobotRepository;
    realmRepository: IRealmRepository;
};

export class RobotService extends AbstractEntityService implements IRobotService {
    protected repository: IRobotRepository;

    protected realmRepository: IRealmRepository;

    protected validator: RobotValidator;

    constructor(ctx: RobotServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new RobotValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Robot>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
        });

        const {
            data: entities, 
            meta, 
        } = await this.repository.findMany(query);

        const data: Robot[] = [];
        let { total } = meta;

        for (const entity of entities) {
            if (
                actor.identity &&
                actor.identity.type === 'robot' &&
                actor.identity.data.id === entity.id
            ) {
                data.push(entity);
                continue;
            }

            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: [
                        PermissionName.ROBOT_READ,
                        PermissionName.ROBOT_UPDATE,
                        PermissionName.ROBOT_DELETE,
                    ],
                    input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
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
    ): Promise<Robot> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
        });

        let entity: Robot | null;
        if (isUUID(idOrName)) {
            entity = await this.repository.findOneById(idOrName);
        } else if (realmId) {
            const realm = await this.realmRepository.resolve(realmId);
            entity = realm ?
                await this.repository.findOneBy({
                    name: idOrName,
                    realm_id: realm.id, 
                }) :
                null;
        } else {
            entity = await this.repository.findOneByName(idOrName);
        }

        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Robot> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Robot> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{
        entity: Robot,
        created: boolean 
    }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
            undefined;

        let entity: Robot | null | undefined;
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

        let isSelfEdit = false;
        if (entity) {
            try {
                await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_UPDATE });
            } catch (e) {
                if (
                    !actor.identity ||
                    actor.identity.type !== 'robot' ||
                    actor.identity.data.id !== entity.id
                ) {
                    throw e;
                }
                isSelfEdit = true;
                await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_SELF_MANAGE });
            }
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        await this.repository.checkUniqueness(validated, entity || undefined);

        const credentialsService = new RobotCredentialsService();

        if (entity) {
            if (isSelfEdit) {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.ROBOT_SELF_MANAGE,
                    input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
                });
            } else {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.ROBOT_UPDATE,
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: {
                            ...entity,
                            ...validated,
                        },
                    }),
                });
            }

            entity = this.repository.merge(entity, validated);
            if (validated.secret) {
                entity.secret = await credentialsService.protect(validated.secret);
            }

            await this.repository.save(entity);

            if (validated.secret) {
                entity.secret = validated.secret;
            }

            return {
                entity,
                created: false, 
            };
        }

        if (!validated.realm_id) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realm_id = actorRealmId;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
        });

        if (!validated.secret) {
            validated.secret = credentialsService.generateSecret();
        }

        entity = this.repository.create(validated);
        entity.secret = await credentialsService.protect(validated.secret);
        await this.repository.save(entity);
        entity.secret = validated.secret;

        return {
            entity,
            created: true, 
        };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Robot> {
        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        const isOwner = entity.user_id &&
            actor.identity &&
            actor.identity.type === 'user' &&
            actor.identity.data.id === entity.user_id;

        let isSelfDelete = false;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_DELETE });
        } catch (e) {
            if (!isOwner) {
                throw e;
            }
            isSelfDelete = true;
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_SELF_MANAGE });
        }

        if (isSelfDelete) {
            // Delete carries no attributes to validate; pass an empty input so
            // the ATTRIBUTE_NAMES denylist has no keys to reject.
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.ROBOT_SELF_MANAGE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: {} }),
            });
        } else {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.ROBOT_DELETE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
            });
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
