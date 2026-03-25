/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderProtocol } from '@authup/core-kit';
import type { IEntityRepository } from '../types.ts';

export interface IIdentityProviderRepository extends IEntityRepository<IdentityProvider> {
    checkUniqueness(data: Partial<IdentityProvider>, existing?: IdentityProvider): Promise<void>;

    saveWithEA(entity: IdentityProvider, attributes?: Record<string, any>): Promise<IdentityProvider>;

    findByProtocol(protocol: IdentityProviderProtocol, realmKey?: string): Promise<IdentityProvider[]>;
}
