/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Realm, Role } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { PermissionPolicyBinding } from '@authup/access';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository  } from '@authup/server-kit';
import type { IRealmProvisioner } from '../../provisioning/types.ts';

/**
 * One system-provisioned public client (plan 079): `admin-console` or
 * `account-console`. `displayName` is seeded at CREATE only; the
 * MERGE-owned attribute set is derived per definition by
 * `buildSystemClientAttributes`.
 */
export type SystemClientDefinition = {
    name: string;
    displayName: string;
    scopeNames: string[];
};

/**
 * Ensures a realm has its system-provisioned public clients
 * (`admin-console`, `account-console`). Used by startup provisioning
 * (every realm) and the runtime realm-create hook (a single realm).
 * System-level — never gated on an actor.
 */
export interface ISystemClientProvisioner extends IRealmProvisioner {
    ensureForRealm(realm: Realm | { id: string }): Promise<void>;
}

export interface IClientRepository extends IEntityRepository<Client> {
    checkUniqueness(data: Partial<Client>, existing?: Client): Promise<void>;

    findOne(id: string, query?: IQuery, realm?: string): Promise<Client | null>;

    findOneWithSecret(where: Record<string, any>): Promise<Client | null>;

    getBoundRoles(entity: string | Client): Promise<Role[]>;

    getBoundPermissions(entity: string | Client): Promise<PermissionPolicyBinding[]>;

    /**
     * Runs `fn` inside one database transaction. Single-row reads on the
     * handed-in repository (`findOneBy`, `findOneWithSecret`) are taken FOR
     * UPDATE where the driver supports it and `save` commits with the
     * callback, so a read-modify-write across the three calls cannot revert
     * a concurrent write (#3526). Keep the callback to calls on the handed-in repository:
     * the transaction pins one pooled connection, and anything else that
     * reaches the DataSource (the permission evaluator, `validateJoinColumns`,
     * `checkUniqueness`) takes a second one, which exhausts the pool under
     * concurrent saves.
     */
    transaction<R>(fn: (repository: IClientRepository) => Promise<R>): Promise<R>;
}

export interface IClientService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Client>>;
    getOne(
        idOrName: string,
        actor: ActorContext,
        query?: Record<string, any>,
        realmId?: string,
    ): Promise<Client>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Client>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Client>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{
        entity: Client,
        created: boolean 
    }>;
    delete(id: string, actor: ActorContext): Promise<Client>;
}
