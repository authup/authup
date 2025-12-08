/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { IdentityProviderAttributeMapping } from '@authup/core-kit';

export interface IIdentityProviderAttributeMappingRepository {
    findByProviderId(providerId: string) : Promise<IdentityProviderAttributeMapping[]>;
}
