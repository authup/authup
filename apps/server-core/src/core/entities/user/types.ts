/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role, User } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { PermissionPolicyBinding } from '@authup/access';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository  } from '@authup/server-kit';

export interface IUserRepository extends IEntityRepository<User> {
    checkUniqueness(data: Partial<User>, existing?: User): Promise<void>;

    findOne(id: string, query?: IQuery, realm?: string): Promise<User | null>;

    findOneByWithEmail(where: Record<string, any>): Promise<User | null>;

    getBoundRoles(entity: string | User): Promise<Role[]>;

    getBoundPermissions(entity: string | User): Promise<PermissionPolicyBinding[]>;

    /**
     * Runs `fn` inside one database transaction. Single-row reads on the
     * handed-in repository (`findOneBy`) are taken FOR UPDATE where the
     * driver supports it and `save` commits with the callback, so a
     * read-modify-write across the three calls cannot revert a concurrent
     * write (#3526). Keep the callback to calls on the handed-in repository:
     * the transaction pins one pooled connection, and anything else that
     * reaches the DataSource (the permission evaluator, `validateJoinColumns`,
     * `checkUniqueness`) takes a second one, which exhausts the pool under
     * concurrent saves.
     */
    transaction<R>(fn: (repository: IUserRepository) => Promise<R>): Promise<R>;
}

export interface IUserService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<User>>;
    getOne(idOrName: string, actor: ActorContext, query?: Record<string, any>, realmId?: string): Promise<User>;
    create(data: Record<string, any>, actor: ActorContext): Promise<User>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<User>;
    save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options?: { updateOnly?: boolean },
    ): Promise<{
        entity: User,
        created: boolean 
    }>;
    delete(id: string, actor: ActorContext): Promise<User>;
}
