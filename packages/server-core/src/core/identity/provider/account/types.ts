/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount } from '@authup/core-kit';
import type { DeepPartial } from 'typeorm';
import type { IUserIdentityRepository } from '../../entities';
import type { IIdentityProviderMapper } from '../mapper';
import type { IdentityProviderIdentity } from '../types';

export interface IIdentityProviderAccountRepository {
    /**
     * Find identity account with user relation.
     *
     * @param identity
     */
    findOneByProviderIdentity(identity: IdentityProviderIdentity) : Promise<IdentityProviderAccount | null>;

    save(entity: DeepPartial<IdentityProviderAccount>) : Promise<IdentityProviderAccount>;
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
}
