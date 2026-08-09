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
     * Number of linked accounts a user holds (the unlink guardrail input).
     */
    countByUserId(userId: string): Promise<number>;

    /**
     * Find identity account with user relation (federated login + link flow).
     */
    findOneByProviderIdentity(identity: IdentityProviderIdentity): Promise<IdentityProviderAccount | null>;

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
