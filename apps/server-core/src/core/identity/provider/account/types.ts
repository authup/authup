/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import type { IUserIdentityRepository } from '../../entities/index.ts';
import type { IIdentityProviderMapper } from '../mapper/index.ts';
import type { IdentityProviderIdentity } from '../types.ts';
// The account repository port moved into the entity module (plan 091):
// one unified port serves the management API and the login/link flows.
import type { IIdentityProviderAccountRepository } from '../../../entities/identity-provider-account/types.ts';

export type { IIdentityProviderAccountRepository } from '../../../entities/identity-provider-account/types.ts';

/**
 * A resolved external identity awaiting a bearer-authenticated confirmation
 * (issue #3439). The callback that resolved it is unauthenticated, so it may
 * not perform the credential binding itself; it stashes this projection under
 * a one-time handle and the account console redeems it with its bearer.
 *
 * Deliberately four scalars rather than the `IdentityProviderIdentity` it was
 * projected from: that object carries the full provider entity (including the
 * EA-loaded `clientSecret`) and the raw external token payload, neither of
 * which belongs in a cache. They are also exactly what `link()` reads.
 */
export type IdentityProviderAccountLink = {
    providerId: string,
    /**
     * The user the link-request was minted for. The confirm endpoint
     * requires it to equal the AUTHENTICATED user, which is what stops an
     * attacker-minted handle from binding a victim's external identity to
     * the attacker's account.
     */
    userId: string,
    providerUserId: string,
    providerUserName?: string | null,
    providerUserEmail?: string | null,
};

export interface IIdentityProviderAccountLinkStore {
    /**
     * @returns the one-time handle
     */
    save(data: IdentityProviderAccountLink) : Promise<string>;

    /**
     * Reads and DROPS the stash. Single use: a handle that reaches a log or
     * a browser history entry must not be redeemable twice.
     */
    consume(handle: string) : Promise<IdentityProviderAccountLink | null>;
}

export type IdentityProviderAccountManagerContext = {
    attributeMapper: IIdentityProviderMapper,
    permissionMapper: IIdentityProviderMapper,
    roleMapper: IIdentityProviderMapper,

    repository: IIdentityProviderAccountRepository,
    userRepository: IUserIdentityRepository
};

export interface IIdentityProviderAccountManager {
    /**
     * Create or update identity provider account by provider identity.
     *
     * @param identity
     */
    save(identity: IdentityProviderIdentity) : Promise<IdentityProviderAccount>;

    /**
     * Explicitly link the external identity to an EXISTING user (plan
     * 091): creates or refreshes the account row only. Never mutates the
     * user, never runs attribute/role/permission mappers, never creates
     * a user.
     *
     * @param identity
     * @param userId
     */
    link(identity: IdentityProviderIdentity, userId: string) : Promise<IdentityProviderAccount>;
}
