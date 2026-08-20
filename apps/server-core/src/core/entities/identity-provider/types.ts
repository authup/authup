/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderProtocol } from '@authup/core-kit';
import type { IEntityRepository } from '@authup/server-kit';

export interface IIdentityProviderRepository extends IEntityRepository<IdentityProvider> {
    checkUniqueness(data: Partial<IdentityProvider>, existing?: IdentityProvider): Promise<void>;

    /**
     * `keepAll` leaves attributes the caller never mentioned in place, which is
     * what a partial update needs: the default replaces the whole set, so an
     * omitted key is deleted. The option is the persistence layer's own, named
     * here structurally so core stays free of the adapter's types.
     */
    saveWithEA(
        entity: IdentityProvider,
        attributes?: Record<string, any>,
        options?: { keepAll?: boolean },
    ): Promise<IdentityProvider>;

    findByProtocol(protocol: IdentityProviderProtocol, realmKey?: string): Promise<IdentityProvider[]>;
}
