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
    ClientSecretMode,
    ClientSecretRotateValidator,
    ClientValidator,
    EntityType,
    EventName,
    EventScope,
    PermissionName,
    getClientSecretMode,
} from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';
import type { EventRequestContext, IEventService } from '../event/index.ts';
import { AbstractEntityService } from '@authup/server-kit';
import { ClientCredentialsService } from '../../authentication/credential/entities/client/module.ts';
import type { ClientSecretRotateResult, IClientRepository, IClientService } from './types.ts';
import { CLIENT_READ_PERMISSIONS } from './constants.ts';
import { decodeQuery } from '../../query/index.ts';
import { clientSchema } from './schema.ts';

export type ClientServiceContext = {
    repository: IClientRepository;
    realmRepository: IRealmRepository;
    eventService?: IEventService;
    requestContext?: () => EventRequestContext | undefined;
};

export class ClientService extends AbstractEntityService implements IClientService {
    protected repository: IClientRepository;

    protected realmRepository: IRealmRepository;

    protected validator: ClientValidator;

    protected secretValidator: ClientSecretRotateValidator;

    protected eventService?: IEventService;

    protected requestContext?: () => EventRequestContext | undefined;

    constructor(ctx: ClientServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new ClientValidator();
        this.secretValidator = new ClientSecretRotateValidator();
        this.eventService = ctx.eventService;
        this.requestContext = ctx.requestContext;
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

        // A hashed value discloses nothing; every other stored form is the
        // secret itself (encrypted rows are decrypted for a permitted reader
        // from plan 105 PR 2 on), so it takes the reach evaluate.
        if (
            !isMe &&
            entity.secret &&
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

        // Reserve the system-provisioned client names (`system`, the console
        // clients) so an API caller can't create or rename a client onto them: that would
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

        assertSecretModeSupported(validated);

        // A protected secret is replaced only through rotateSecret, together
        // with the mode it is stored under; the metadata path must never be
        // able to downgrade it (plan 105).
        if (
            entity &&
            typeof validated.secret === 'string' &&
            getClientSecretMode(entity) !== ClientSecretMode.PLAIN
        ) {
            throw new ValidationError('The secret of a hashed or encrypted client is rotated through POST /clients/:id/secret.');
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

            const before: Partial<Client> = { ...entity };
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

            // Only the write runs inside the transaction: it pins one pooled
            // connection, and the evaluator, join-column and uniqueness reads
            // above each take their own from the same pool, so wrapping them
            // too deadlocks the DataSource under ten concurrent saves. The
            // fresh row is lock-read and this request's patch merged onto it,
            // so a concurrent writer's columns survive (#3526).
            const patch: Partial<Client> = { ...validated };
            // A field echoed back with the value this request read is no
            // intent to change it (the console posts its whole form), and
            // writing it would overwrite a concurrent change.
            for (const key of Object.keys(patch) as (keyof Client)[]) {
                if (patch[key] === before[key]) {
                    delete patch[key];
                }
            }

            const { id } = entity;
            entity = await this.repository.transaction(async (repository) => {
                const current = await repository.findOneWithSecret({ id });
                if (!current) {
                    throw new EntityNotFoundError();
                }

                // The secret follows the FRESH row's authMethod, not the one
                // this request read: a concurrent switch to `secret` must not
                // have its credential cleared by an unrelated edit racing it.
                const merged = repository.merge(current, patch);
                if (merged.authMethod !== ClientAuthMethod.SECRET) {
                    merged.secret = null;
                    merged.secretHashed = false;
                    merged.secretEncrypted = false;
                } else if (patch.secret) {
                    merged.secret = await credentialsService.protect(patch.secret, merged);
                }

                return repository.save(merged);
            });

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

    async rotateSecret(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realmId?: string,
    ): Promise<ClientSecretRotateResult> {
        const where: Record<string, any> = isUUID(idOrName) ?
            { id: idOrName } :
            { name: idOrName };

        if (realmId) {
            const realm = await this.realmRepository.resolve(realmId);
            if (!realm) {
                throw new EntityNotFoundError();
            }

            where.realmId = realm.id;
        }

        const entity = await this.repository.findOneWithSecret(where);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const isMe = !!actor.identity &&
            actor.identity.type === 'client' &&
            actor.identity.data.id === entity.id;

        let isSelfEdit = false;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_UPDATE });
        } catch (e) {
            if (!isMe) {
                throw e;
            }

            isSelfEdit = true;
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_SELF_MANAGE });
        }

        if (entity.authMethod !== ClientAuthMethod.SECRET) {
            throw new ValidationError('Only a client authenticating by secret holds a secret to rotate.');
        }

        const validated = await this.secretValidator.run(data);

        const currentMode = getClientSecretMode(entity);
        const mode = validated.mode ?? currentMode;
        const flags = {
            secretHashed: mode === ClientSecretMode.HASHED,
            secretEncrypted: mode === ClientSecretMode.ENCRYPTED,
        };
        assertSecretModeSupported(flags);

        const credentialsService = new ClientCredentialsService();
        const secret = validated.secret ?? credentialsService.generateSecret();

        if (isSelfEdit) {
            // The mode flags reach the policy only when they change, so the
            // self-manage denylist refuses a self-managing client's downgrade
            // and permits a plain rotation, with no rule of its own here.
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.CLIENT_SELF_MANAGE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        secret,
                        ...(mode !== currentMode ? flags : {}),
                    },
                    ...this.resourceRealmMatch(entity),
                }),
            });
        } else {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.CLIENT_UPDATE,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
            });
        }

        // Protect BEFORE the write and take no row lock: these three columns
        // have exactly one writer, and the update path's patch never carries
        // them, so there is no lost update to defend against (#3526), and
        // nothing that could reach the key store inside a pinned connection.
        entity.secret = await credentialsService.protect(secret, flags);
        entity.secretHashed = flags.secretHashed;
        entity.secretEncrypted = flags.secretEncrypted;

        const saved = await this.repository.save(entity);

        await this.recordSecretRotated(saved, actor, mode);

        return { entity: saved, secret };
    }

    /**
     * Metadata-only audit row for a credential rotation: the mode it was
     * stored under, never the secret in any form.
     */
    protected async recordSecretRotated(
        entity: Client,
        actor: ActorContext,
        mode: `${ClientSecretMode}`,
    ): Promise<void> {
        if (!this.eventService) {
            return;
        }

        const requestContext = this.requestContext ?
            this.requestContext() :
            undefined;

        await this.eventService.record({
            scope: EventScope.IDENTITY,
            name: EventName.CLIENT_SECRET_ROTATED,
            refType: EntityType.CLIENT,
            refId: entity.id,
            realmId: entity.realmId ?? null,
            actorType: actor.identity?.type ?? null,
            actorId: actor.identity?.data.id ?? null,
            actorName: actor.identity?.data.name ?? null,
            sessionId: requestContext?.sessionId ?? null,
            requestPath: requestContext?.requestPath ?? null,
            requestMethod: requestContext?.requestMethod ?? null,
            requestIpAddress: requestContext?.requestIpAddress ?? null,
            requestUserAgent: requestContext?.requestUserAgent ?? null,
            data: { kind: mode },
        });
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

/**
 * The encrypted storage flag is refused outright until plan 105 PR 2 backs
 * it with the realm cipher: a flag nothing honours must not be persistable
 * (#3351). PR 2 turns this into the "never both flags" rule.
 */
export function assertSecretModeSupported(flags: Pick<Partial<Client>, 'secretHashed' | 'secretEncrypted'>): void {
    if (flags.secretEncrypted) {
        throw new ValidationError('Encrypted client secrets are not supported yet.');
    }
}
