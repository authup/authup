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
    ClientValidator,
    PermissionName,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import { ClientCredentialsService } from '../../authentication/credential/entities/client/module.ts';
import type { IClientRepository, IClientService } from './types.ts';

export type ClientServiceContext = {
    repository: IClientRepository;
    realmRepository: IRealmRepository;
};

export class ClientService extends AbstractEntityService implements IClientService {
    protected repository: IClientRepository;

    protected realmRepository: IRealmRepository;

    protected validator: ClientValidator;

    constructor(ctx: ClientServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new ClientValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Client>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_READ,
                PermissionName.CLIENT_UPDATE,
                PermissionName.CLIENT_DELETE,
            ],
        });

        const {
            data: entities, 
            meta 
        } = await this.repository.findMany(query);
        let {
            total 
        } = meta;

        const data: Client[] = [];
        for (const entity of entities) {
            if (
                entity.secret &&
                !entity.secret_encrypted &&
                !entity.secret_hashed
            ) {
                try {
                    await actor.permissionEvaluator.evaluateOneOf({
                        name: [
                            PermissionName.CLIENT_READ,
                            PermissionName.CLIENT_UPDATE,
                            PermissionName.CLIENT_DELETE,
                        ],
                        input: new PolicyData({
                            [BuiltInPolicyType.ATTRIBUTES]: entity,
                        }),
                    });
                    data.push(entity);
                } catch {
                    total -= 1;
                }

                continue;
            }

            data.push(entity);
        }

        return {
            data,
            meta: {
                ...meta,
                total 
            } 
        };
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
        realmId?: string,
    ): Promise<Client> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_READ,
                PermissionName.CLIENT_UPDATE,
                PermissionName.CLIENT_DELETE,
            ],
        });

        let entity: Client | null;

        if (isUUID(idOrName)) {
            entity = await this.repository.findOneByIdOrName(idOrName, realmId);
        } else if (realmId) {
            const realm = await this.realmRepository.resolve(realmId);
            if (realm) {
                entity = await this.repository.findOneBy({
                    name: idOrName,
                    realm_id: realm.id,
                });
            } else {
                entity = null;
            }
        } else {
            entity = await this.repository.findOneByName(idOrName);
        }

        if (!entity) {
            throw new NotFoundError();
        }

        if (
            entity.secret &&
            !entity.secret_encrypted &&
            !entity.secret_hashed
        ) {
            await actor.permissionEvaluator.evaluateOneOf({
                name: [
                    PermissionName.CLIENT_READ,
                    PermissionName.CLIENT_UPDATE,
                    PermissionName.CLIENT_DELETE,
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
    ): Promise<Client> {
        const {
            entity 
        } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Client> {
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
        entity: Client,
        created: boolean 
    }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
            undefined;

        let entity: Client | null | undefined;
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

            entity = await this.repository.findOneWithSecret(where);
            if (!entity && options.updateOnly) {
                throw new NotFoundError();
            }
        } else if (options.updateOnly) {
            throw new NotFoundError();
        }

        if (entity) {
            await actor.permissionEvaluator.preEvaluate({
                name: PermissionName.CLIENT_UPDATE 
            });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({
                name: PermissionName.CLIENT_CREATE 
            });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, {
            group 
        });

        await this.repository.validateJoinColumns(validated);
        await this.repository.checkUniqueness(validated, entity || undefined);

        const credentialsService = new ClientCredentialsService();

        if (entity) {
            if (
                !validated.realm_id &&
                !entity.realm_id
            ) {
                const actorRealmId = this.getActorRealmId(actor);
                if (actorRealmId) {
                    validated.realm_id = actorRealmId;
                }
            }

            entity = this.repository.merge(entity, validated);

            await actor.permissionEvaluator.evaluate({
                name: PermissionName.CLIENT_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                }),
            });

            if (entity.is_confidential) {
                if (!validated.secret && !entity.secret) {
                    validated.secret = credentialsService.generateSecret();
                }

                if (validated.secret) {
                    entity.secret = await credentialsService.protect(validated.secret, entity);
                }
            } else {
                entity.secret = null;
            }

            await this.repository.save(entity);

            return {
                entity,
                created: false 
            };
        }

        if (!validated.realm_id) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realm_id = actorRealmId;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
            }),
        });

        entity = this.repository.create(validated);

        if (entity.is_confidential) {
            if (!validated.secret) {
                validated.secret = credentialsService.generateSecret();
            }

            entity.secret = await credentialsService.protect(validated.secret, validated);
        } else {
            entity.secret = null;
        }

        await this.repository.save(entity);

        return {
            entity,
            created: true 
        };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Client> {
        await actor.permissionEvaluator.preEvaluate({
            name: PermissionName.CLIENT_DELETE 
        });

        const entity = await this.repository.findOneBy({
            id 
        });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_DELETE,
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
