/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { ValidatorGroup, isUUID } from '@authup/kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { eq, inArray, or } from '@rapiq/core';
import {
    PermissionName,
    UserValidator,
} from '@authup/core-kit';
import type { User } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '@authup/server-kit';
import { UserCredentialsService } from '../../authentication/credential/entities/user/module.ts';
import type { IUserRepository, IUserService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { userSchema } from './schema.ts';

export type UserServiceContext = {
    repository: IUserRepository;
    realmRepository: IRealmRepository;
    passwordMinLength?: number;
};

export class UserService extends AbstractEntityService implements IUserService {
    protected repository: IUserRepository;

    protected realmRepository: IRealmRepository;

    protected validator: UserValidator;

    constructor(ctx: UserServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new UserValidator({ passwordMinLength: ctx.passwordMinLength });
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<User>> {
        const permissionNames = [
            PermissionName.USER_READ,
            PermissionName.USER_UPDATE,
            PermissionName.USER_DELETE,
        ];

        await actor.permissionEvaluator.preEvaluateOneOf({ name: permissionNames });

        const parsed = await decodeQuery(query, { schema: userSchema, actor });

        // Compile the read permissions into a row condition (#3286 phase 3). The
        // own row is always readable, so the self short-circuit composes as an
        // OR-alternative — the whole gate runs as WHERE and pagination/totals
        // stay exact. A non-expressible policy falls back to the per-row loop
        // below.
        const compiled = await actor.permissionEvaluator.compile({ name: permissionNames });
        if (compiled.verdict !== 'post') {
            const self = actor.identity && actor.identity.type === 'user' ?
                eq('id', actor.identity.data.id) :
                null;

            let scoped = parsed;
            if (compiled.verdict === 'deny') {
                scoped = appendQueryConditions(parsed, self ?? inArray('id', []));
            } else if (compiled.verdict === 'conditional') {
                scoped = appendQueryConditions(
                    parsed,
                    self ? or(self, compiled.condition) : compiled.condition,
                );
            }

            return this.repository.findMany(scoped);
        }

        const {
            data: entities,
            meta,
        } = await this.repository.findMany(parsed);

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
                    data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
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
        query?: Record<string, any>,
        realmId?: string,
    ): Promise<User> {
        const permissionNames = [
            PermissionName.USER_READ,
            PermissionName.USER_UPDATE,
            PermissionName.USER_DELETE,
        ];

        let isMe = !!actor.identity &&
            actor.identity.type === 'user' &&
            (
                actor.identity.data.id === idOrName ||
                actor.identity.data.name === idOrName
            );

        if (!isMe) {
            await actor.permissionEvaluator.preEvaluateOneOf({ name: permissionNames });
        }

        const entity = await this.repository.findOne(
            idOrName,
            await decodeQuery(query, {
                schema: userSchema, 
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
            await actor.permissionEvaluator.preEvaluateOneOf({ name: permissionNames });
        }

        if (!isMe) {
            await actor.permissionEvaluator.evaluateOneOf({
                name: permissionNames,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
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
    ): Promise<{
        entity: User,
        created: boolean 
    }> {
        let group: string;

        const realm = typeof data.realmId === 'string' ?
            await this.realmRepository.resolve(data.realmId) :
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
                where.realmId = realm.id;
            }

            entity = await this.repository.findOneBy(where);
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
                await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_UPDATE });
            } catch (e) {
                if (
                    !actor.identity ||
                    actor.identity.type !== 'user' ||
                    actor.identity.data.id !== entity.id
                ) {
                    throw e;
                }
                isSelfEdit = true;
                await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_SELF_MANAGE });
            }

            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_CREATE });

            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        const credentialsService = new UserCredentialsService();

        if (entity) {
            const originalName = entity.name;
            const originalNameLocked = entity.nameLocked;

            // A changed address carries none of the old one's verification, and
            // `email` is NOT on the self-manage denylist, so without this a user
            // verifies their own address and then edits it to someone else's
            // while the claim keeps asserting `email_verified: true`: the very
            // account-linking takeover the claim is read for (#3519).
            //
            // The old value has to be re-read: the entity loaded above carries
            // no `email` at all, because the column is `select: false`. Read
            // BEFORE the merge below, which writes the new address onto that
            // same entity.
            //
            // An `emailVerified` that DIFFERS from the stored value is a
            // deliberate assertion and wins, so an admin can change the address
            // and vouch for the new one in one request. One merely ECHOED back
            // is not: `AUserForm` posts its whole reactive state on every save,
            // hydrated from the record it loaded, so treating presence alone as
            // an assertion made the rule unreachable from the console: every
            // address change there carried the stale `true` straight through.
            let emailChanged = false;
            if (
                validated.email &&
                (
                    typeof validated.emailVerified === 'undefined' ||
                    validated.emailVerified === entity.emailVerified
                )
            ) {
                const current = await this.repository.findOneByWithEmail({ id: entity.id });
                emailChanged = !!current && current.email !== validated.email;
            }

            if (isSelfEdit) {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.USER_SELF_MANAGE,
                    data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated, ...this.resourceRealmMatch(validated) }),
                });
            }

            const before: Partial<User> = { ...entity };
            entity = this.repository.merge(entity, validated);

            if (
                validated.name &&
                validated.name !== originalName
            ) {
                if (validated.nameLocked) {
                    entity.nameLocked = validated.nameLocked;
                }

                if (originalNameLocked && validated.nameLocked !== false) {
                    entity.name = originalName;
                }
            }

            if (!isSelfEdit) {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.USER_UPDATE,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: {
                            ...entity,
                            ...validated,
                        },
                        [BuiltInPolicyType.REALM_MATCH]: validated.realmId ?? entity.realmId ?? null,
                    }),
                });
            }

            if (emailChanged) {
                entity.emailVerified = false;
            }

            if (validated.password) {
                entity.password = await credentialsService.protect(validated.password);
            }

            // Only the write runs inside the transaction. It pins one pooled
            // connection, and the permission evaluator, the join-column check
            // and the email re-read above each take their own from the same
            // pool, so wrapping them too deadlocks the DataSource under ten
            // concurrent saves. The fresh row is lock-read and this request's
            // patch merged onto it: TypeORM writes only the columns that
            // differ, so a concurrent writer's columns survive (#3526).
            const patch: Partial<User> = { ...validated };
            // A field echoed back with the value this request read is no
            // intent to change it (the console posts its whole form), and
            // writing it would overwrite a concurrent change. The name-lock
            // revert falls under the same rule: a stale originalName must not
            // overwrite a concurrent rename.
            for (const key of Object.keys(patch) as (keyof User)[]) {
                if (patch[key] === before[key]) {
                    delete patch[key];
                }
            }
            if (entity.name === originalName) {
                delete patch.name;
            }
            if (emailChanged) {
                patch.emailVerified = false;
            }
            if (validated.password) {
                patch.password = entity.password;
            }

            const { id } = entity;
            entity = await this.repository.transaction(async (repository) => {
                const current = await repository.findOneBy({ id });
                if (!current) {
                    throw new EntityNotFoundError();
                }

                // The lock is re-checked against the FRESH row: a rename
                // racing a concurrent nameLocked flip must still lose.
                const { name: currentName, nameLocked: currentNameLocked } = current;
                const merged = repository.merge(current, patch);
                if (patch.name && currentNameLocked && validated.nameLocked !== false) {
                    merged.name = currentName;
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

        entity = this.repository.create(validated);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_CREATE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        if (validated.password) {
            entity.password = await credentialsService.protect(validated.password);
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
    ): Promise<User> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_DELETE });

        if (
            actor.identity &&
            actor.identity.type === 'user' &&
            actor.identity.data.id === id
        ) {
            throw new ValidationError('The own user can not be deleted.');
        }

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_DELETE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
