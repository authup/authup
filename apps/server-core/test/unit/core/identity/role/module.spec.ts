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

    it('should return all roles for a request without a token client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor({ type: 'user', id: 'u1' }, { tokenClientId: null });

        expect(result).toEqual([globalRole, webRole, otherRole]);
    });

    it('should keep client-agnostic (null) roles plus roles owned by the token client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor({ type: 'user', id: 'u1' }, { tokenClientId: 'web-client-id' });

        // The global role MUST survive: a token issued to a client must
        // not strip a user's global/realm roles.
        expect(result).toEqual([globalRole, webRole]);
    });

    it('should not read the subject\'s own clientId as the token client', async () => {
        const provider = createProvider([globalRole, webRole, otherRole]);

        const result = await provider.getRolesFor(
            {
                type: 'user', 
                id: 'u1', 
                clientId: 'web-client-id', 
            },
            { tokenClientId: null },
        );

        expect(result).toEqual([globalRole, webRole, otherRole]);
    });
});
