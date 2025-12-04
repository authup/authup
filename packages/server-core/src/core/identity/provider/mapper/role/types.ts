/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRoleMapping } from '@authup/core-kit';

export interface IIdentityProviderRoleMappingRepository {
    findByProviderId(providerId: string) : Promise<IdentityProviderRoleMapping>;
}
