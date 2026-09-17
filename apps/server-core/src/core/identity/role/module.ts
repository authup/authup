/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { IdentityPolicyData } from '@authup/access';
import type { IClientRepository } from '../../entities/client/types.ts';
import type { IUserRepository } from '../../entities/user/types.ts';
import type { IIdentityRoleProvider, IdentityRoleProviderContext } from './types.ts';

export class IdentityRoleProvider implements IIdentityRoleProvider {
    protected clientRepository: IClientRepository;

    protected userRepository: IUserRepository;

    constructor(ctx: IdentityRoleProviderContext) {
        this.clientRepository = ctx.clientRepository;
        this.userRepository = ctx.userRepository;
    }

    async getRolesFor(identity: IdentityPolicyData) : Promise<Role[]> {
        switch (identity.type) {
            case 'client': {
                return this.clientRepository.getBoundRoles(identity.id);
            }
            case 'user': {
                return this.userRepository.getBoundRoles(identity.id)
                    .then((data) => this.reduceByIdentityClient(data, identity));
            }
        }

        return [];
    }

    private reduceByIdentityClient<T extends { clientId?: string | null }>(
        entities: T[],
        identity: IdentityPolicyData,
    ): T[] {
        if (!identity.clientId) {
            return entities;
        }

        // Keep client-agnostic (global / realm) roles — clientId null — in
        // addition to roles scoped to the authenticating client. Dropping the
        // null case stripped every global/realm role from a token issued via
        // a real client (e.g. the per-realm `web` client used by the
        // realm-selection login), leaving permissions/roles empty.
        return entities.filter(
            (entity) => !entity.clientId || entity.clientId === identity.clientId,
        );
    }
}
