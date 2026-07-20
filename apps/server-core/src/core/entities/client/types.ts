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

/**
 * Ensures a realm has its system-provisioned public `web` client.
 * Used by startup provisioning (every realm) and the runtime realm-create
 * hook (a single realm). System-level — never gated on an actor.
 */
export interface IWebClientProvisioner {
    ensureForRealm(realm: Realm | { id: string }): Promise<void>;
}

export interface IClientRepository extends IEntityRepository<Client> {
    checkUniqueness(data: Partial<Client>, existing?: Client): Promise<void>;

    findOne(id: string, query?: IQuery, realm?: string): Promise<Client | null>;

    findOneWithSecret(where: Record<string, any>): Promise<Client | null>;

    getBoundRoles(entity: string | Client): Promise<Role[]>;

    getBoundPermissions(entity: string | Client): Promise<PermissionPolicyBinding[]>;
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
