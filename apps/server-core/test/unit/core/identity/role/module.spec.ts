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
    IUserRepository,
} from '../../../../../src/core/index';

function role(name: string, clientId: string | null): Role {
    return { name, clientId } as Role;
}

function createProvider(boundRoles: Role[]) {
    const userRepository = { getBoundRoles: async () => boundRoles } as unknown as IUserRepository;

    return new IdentityRoleProvider({
        userRepository,
        clientRepository: {} as IClientRepository,
    });
}

describe('IdentityRoleProvider', () => {
    const globalRole = role('admin', null);
    const webRole = role('web-scoped', 'web-client-id');
    const otherRole = role('other-scoped', 'other-client-id');

    it('should return all roles for a credential issued to no client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor({ type: 'user', id: 'u1' }, { credentialClientId: null });

        expect(result).toEqual([globalRole, webRole, otherRole]);
    });

    it('should keep client-agnostic (null) roles plus roles owned by the credential client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor({ type: 'user', id: 'u1' }, { credentialClientId: 'web-client-id' });

        // The global role MUST survive: a credential issued to a client must
        // not strip a user's global/realm roles.
        expect(result).toEqual([globalRole, webRole]);
    });

    it('should not read the subject\'s own clientId as the credential client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor(
            {
                type: 'user', 
                id: 'u1', 
                clientId: 'web-client-id', 
            },
            { credentialClientId: null },
        );

        expect(result).toEqual([globalRole, webRole, otherRole]);
    });
});
