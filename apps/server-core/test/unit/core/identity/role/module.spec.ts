/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import { IdentityRoleProvider } from '../../../../../src/core/identity/role/module';
import type {
    IClientRepository,
    IRobotRepository,
    IUserRepository,
} from '../../../../../src/core/index';

function role(name: string, clientId: string | null): Role {
    return { name, client_id: clientId } as Role;
}

function createProvider(boundRoles: Role[]) {
    const userRepository = { getBoundRoles: async () => boundRoles } as unknown as IUserRepository;

    return new IdentityRoleProvider({
        userRepository,
        clientRepository: {} as IClientRepository,
        robotRepository: {} as IRobotRepository,
    });
}

describe('IdentityRoleProvider', () => {
    const globalRole = role('admin', null);
    const webRole = role('web-scoped', 'web-client-id');
    const otherRole = role('other-scoped', 'other-client-id');

    it('should return all roles when the identity has no client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor({ type: 'user', id: 'u1' });

        expect(result).toEqual([globalRole, webRole, otherRole]);
    });

    it('should keep client-agnostic (null) roles plus roles scoped to the identity client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor({
            type: 'user',
            id: 'u1',
            clientId: 'web-client-id',
        });

        // The global role MUST survive — authenticating via the per-realm
        // `web` client must not strip a user's global/realm roles.
        expect(result).toEqual([globalRole, webRole]);
    });
});
