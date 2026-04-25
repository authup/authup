/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { IdentityPolicyData } from '@authup/access';
import type { IClientRepository } from '../../entities/client/types.ts';
import type { IRobotRepository } from '../../entities/robot/types.ts';
import type { IUserRepository } from '../../entities/user/types.ts';
import type { IIdentityRoleProvider, IdentityRoleProviderContext } from './types.ts';

export class IdentityRoleProvider implements IIdentityRoleProvider {
    protected clientRepository: IClientRepository;

    protected userRepository: IUserRepository;

    protected robotRepository: IRobotRepository;

    constructor(ctx: IdentityRoleProviderContext) {
        this.clientRepository = ctx.clientRepository;
        this.userRepository = ctx.userRepository;
        this.robotRepository = ctx.robotRepository;
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
            case 'robot': {
                return this.robotRepository.getBoundRoles(identity.id)
                    .then((data) => this.reduceByIdentityClient(data, identity));
            }
        }

        return [];
    }

    private reduceByIdentityClient<T extends { client_id?: string | null }>(
        entities: T[],
        identity: IdentityPolicyData,
    ): T[] {
        if (!identity.clientId) {
            return entities;
        }

        return entities.filter((entity) => entity.client_id === identity.clientId);
    }
}
