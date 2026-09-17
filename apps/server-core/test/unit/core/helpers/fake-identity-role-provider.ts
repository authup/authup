/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { IdentityPolicyData } from '@authup/access';
import type { IIdentityRoleProvider } from '../../../../src/core/identity/role/types.ts';

export class FakeIdentityRoleProvider implements IIdentityRoleProvider {
    public getRolesForCalls: IdentityPolicyData[] = [];

    constructor(private roles: Role[] = []) {}

    setRoles(roles: Role[]) {
        this.roles = roles;
    }

    async getRolesFor(identity: IdentityPolicyData): Promise<Role[]> {
        this.getRolesForCalls.push(identity);
        return this.roles;
    }
}
