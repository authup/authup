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
