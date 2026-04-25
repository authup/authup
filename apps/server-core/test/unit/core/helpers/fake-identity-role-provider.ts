/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import type { IdentityPolicyData } from '@authup/access';
import { vi } from 'vitest';
import type { IIdentityRoleProvider } from '../../../../src/core/identity/role/types.ts';

export class FakeIdentityRoleProvider implements IIdentityRoleProvider {
    constructor(private roles: Role[] = []) {}

    setRoles(roles: Role[]) {
        this.roles = roles;
    }

    public readonly getRolesFor = vi.fn(async (_identity: IdentityPolicyData) => this.roles);
}
