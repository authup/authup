/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { DeepPartial } from 'typeorm';
import type { IdentityProviderIdentity } from '../../identity/provider/types.ts';

/**
 * Filter keys an identity-provider-account list query may target.
 */
export const IDENTITY_PROVIDER_ACCOUNT_FILTER_KEYS = [
    'id',
    'userId',
    'providerId',
    'userRealmId',
    'providerUserId',
] as const;

export type IdentityProviderAccountFindManyOptions = {
    /**
     * Force the result to a single user (self-service). Applied as a
     * mandatory WHERE that a rapiq query filter cannot override.
     */
    userId?: string,
    /**
     * Restrict the result to a single owner realm (the nested
     * `/realms/:realmId/identity-provider-accounts` mount). The owner
     * realm of a row is `userRealmId`.
     */
    realmId?: string,
};

/**
 * Unified port: the entity CRUD surface (management API) plus the
 * account-manager methods the federated login and link flows consume.
 * One adapter implements both concerns over the same table.
 */
export interface IIdentityProviderAccountRepository {
    findMany(query: IQuery, options?: IdentityProviderAccountFindManyOptions): Promise<EntityRepositoryFindManyResult<IdentityProviderAccount>>;

    findOneById(id: string): Promise<IdentityProviderAccount | null>;

    remove(entity: IdentityProviderAccount): Promise<void>;

    /**
     * Atomically remove the account, refusing (returning `false`) when it
     * is the user's LAST linked account and `userHasOtherLogin` is false —
     * the unlink lockout guard. The count and the delete run in one
     * transaction with the user's account rows locked (on drivers that
     * support row locks), so two concurrent unlinks for the same user
     * cannot both pass the guard and strand a password-less user with no
     * login. Fires the entity subscriber like `remove`. Returns `true`
     * when the row was removed.
     */
    removeGuarded(entity: IdentityProviderAccount, userHasOtherLogin: boolean): Promise<boolean>;

    /**
     * Find identity account with user relation (federated login + link flow).
     */
    findOneByProviderIdentity(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount | null>;

    /**
     * Throws `EntityConflictError` (`@authup/errors`) when the row violates
     * EITHER unique index, (providerUserId, providerId) or (providerId,
     * userId): the driver does not tell them apart, so the caller
     * classifies by re-reading the identity.
     */
    save(entity: DeepPartial<IdentityProviderAccount>): Promise<IdentityProviderAccount>;
}

export type IdentityProviderAccountServiceReadOptions = {
    realmId?: string,
};

export interface IIdentityProviderAccountService {
    /**
     * List linked accounts. An actor without
     * `IDENTITY_PROVIDER_ACCOUNT_READ` is scoped to its own rows.
     */
    getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options?: IdentityProviderAccountServiceReadOptions
    ): Promise<EntityRepositoryFindManyResult<IdentityProviderAccount>>;

    /**
     * Read a single linked account. Own rows need no permission.
     */
    getOne(id: string, actor: ActorContext, options?: IdentityProviderAccountServiceReadOptions): Promise<IdentityProviderAccount>;

    /**
     * Unlink. Own rows need no permission. Refuses for EVERY caller when
     * the row is the user's last linked account and the user has no
     * password (lockout guard).
     */
    delete(id: string, actor: ActorContext, options?: IdentityProviderAccountServiceReadOptions): Promise<IdentityProviderAccount>;
}
