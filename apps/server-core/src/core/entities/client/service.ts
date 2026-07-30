/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { ValidatorGroup, isUUID } from '@authup/kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import {
    CLIENT_RESERVED_NAMES,
    ClientAuthMethod,
    ClientValidator,
    PermissionName,
} from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '@authup/server-kit';
import { ClientCredentialsService } from '../../authentication/credential/entities/client/module.ts';
import type { IClientRepository, IClientService } from './types.ts';
import { CLIENT_READ_PERMISSIONS } from './constants.ts';
import { decodeQuery } from '../../query/index.ts';
import { clientSchema } from './schema.ts';

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
        await actor.permissionEvaluator.preEvaluateOneOf({ name: CLIENT_READ_PERMISSIONS });

        // The per-row `secret` visibility gate lives on the client SCHEMA
        // (`fields.validateMany`, issue #3322), so it also covers the
        // `include=client` paths served by other services; the repository
        // layer redacts unauthorized values without dropping rows.
        return this.repository.findMany(
            await decodeQuery(query, { schema: clientSchema, actor }),
        );
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
        query?: Record<string, any>,
        realmId?: string,
    ): Promise<Client> {
        let isMe = !!actor.identity &&
            actor.identity.type === 'client' &&
            (
                actor.identity.data.id === idOrName ||
                actor.identity.data.name === idOrName
            );

        if (!isMe) {
            await actor.permissionEvaluator.preEvaluateOneOf({ name: CLIENT_READ_PERMISSIONS });
        }

        const entity = await this.repository.findOne(
            idOrName,
            await decodeQuery(query, {
                schema: clientSchema, 
                parameters: ['fields', 'relations'], 
                actor, 
            }),
            realmId,
        );
        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (isMe && actor.identity!.data.id !== entity.id) {
            isMe = false;
            await actor.permissionEvaluator.preEvaluateOneOf({ name: CLIENT_READ_PERMISSIONS });
        }

        if (
            !isMe &&
            entity.secret &&
            !entity.secretEncrypted &&
            !entity.secretHashed
        ) {
            await actor.permissionEvaluator.evaluateOneOf({
                name: CLIENT_READ_PERMISSIONS,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
            });
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Client> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Client> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
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

        const realm = typeof data.realmId === 'string' ?
            await this.realmRepository.resolve(data.realmId) :
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
                where.realmId = realm.id;
            }

            entity = await this.repository.findOneWithSecret(where);
            // Only a NAME key may upsert-create. A UUID addresses one specific
            // row, so a miss is a 404 (creating would write a different id).
            if (!entity && (options.updateOnly || where.id)) {
                throw new EntityNotFoundError();
            }
        } else if (options.updateOnly) {
            throw new EntityNotFoundError();
        }

        let isSelfEdit = false;
        if (entity) {
            try {
                await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_UPDATE });
            } catch (e) {
                if (
                    !actor.identity ||
                    actor.identity.type !== 'client' ||
                    actor.identity.data.id !== entity.id
                ) {
                    throw e;
                }
                isSelfEdit = true;
                await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_SELF_MANAGE });
            }
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        // Reserve the system-provisioned client names (`system`, `web`) so an
        // API caller can't create or rename a client onto them — that would
        // collide on unique(name, realmId) or shadow the builtIn client.
        // Provisioning and runtime hooks bypass this service, so they remain
        // free to manage the reserved clients. builtIn clients are exempt
        // (they ARE the provisioned ones) but API callers can never produce a
        // builtIn client since the validator strips the flag.
        if (
            typeof validated.name === 'string' &&
            CLIENT_RESERVED_NAMES.includes(validated.name) &&
            !(entity && entity.builtIn && entity.name === validated.name)
        ) {
            throw new ValidationError(`The client name '${validated.name}' is reserved.`);
        }

        await this.repository.validateJoinColumns(validated);
        await this.repository.checkUniqueness(validated, entity || undefined);

        const credentialsService = new ClientCredentialsService();

        if (entity) {
            if (
                !isSelfEdit &&
                !validated.realmId &&
                !entity.realmId
            ) {
                const actorRealmId = this.getActorRealmId(actor);
                if (actorRealmId) {
                    validated.realmId = actorRealmId;
                }
            }

            if (isSelfEdit) {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.CLIENT_SELF_MANAGE,
                    data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated, ...this.resourceRealmMatch(validated) }),
                });
            }

            entity = this.repository.merge(entity, validated);

            if (!isSelfEdit) {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.CLIENT_UPDATE,
                    data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
                });
            }

            if (entity.authMethod === ClientAuthMethod.SECRET) {
                if (!validated.secret && !entity.secret) {
                    validated.secret = credentialsService.generateSecret();
                }

                if (validated.secret) {
                    entity.secret = await credentialsService.protect(validated.secret, entity);
                }
            } else {
                entity.secret = null;
                entity.secretHashed = false;
                entity.secretEncrypted = false;
            }

            await this.repository.save(entity);

            return {
                entity,
                created: false, 
            };
        }

        if (!validated.realmId) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realmId = actorRealmId;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_CREATE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated, ...this.resourceRealmMatch(validated) }),
        });

        entity = this.repository.create(validated);

        if (entity.authMethod === ClientAuthMethod.SECRET) {
            if (!validated.secret) {
                validated.secret = credentialsService.generateSecret();
            }

            entity.secret = await credentialsService.protect(validated.secret, validated);
        } else {
            entity.secret = null;
            entity.secretHashed = false;
            entity.secretEncrypted = false;
        }

        await this.repository.save(entity);

        return {
            entity,
            created: true, 
        };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Client> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_DELETE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
