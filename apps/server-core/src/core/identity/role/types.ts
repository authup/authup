/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { IdentityCredentialOptions, IdentityPolicyData } from '@authup/access';
import type { IClientRepository } from '../../entities/client/types.ts';
import type { IUserRepository } from '../../entities/user/types.ts';

export interface IIdentityRoleProvider {
    getRolesFor(identity: IdentityPolicyData, options: IdentityCredentialOptions): Promise<Role[]>;
}

export type IdentityRoleProviderContext = {
    clientRepository: IClientRepository;
    userRepository: IUserRepository;
};
