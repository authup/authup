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
import { appliesThroughCredentialClient } from '../permission/credential-client.ts';
import type { IIdentityRoleProvider, IdentityRoleProviderContext } from './types.ts';

export class IdentityRoleProvider implements IIdentityRoleProvider {
    protected clientRepository: IClientRepository;

    protected userRepository: IUserRepository;

    constructor(ctx: IdentityRoleProviderContext) {
        this.clientRepository = ctx.clientRepository;
        this.userRepository = ctx.userRepository;
    }

    async getRolesFor(identity: IdentityPolicyData, options: IdentityCredentialOptions) : Promise<Role[]> {
        switch (identity.type) {
            case 'client': {
                return this.clientRepository.getBoundRoles(identity.id);
            }
            case 'user': {
                const roles = await this.userRepository.getBoundRoles(identity.id);

                return roles.filter((role) => appliesThroughCredentialClient(role.clientId, options.credentialClientId));
            }
        }

        return [];
    }
}
