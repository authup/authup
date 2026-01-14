/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderProtocol } from '@authup/core-kit';

export interface IIdentityProviderRepository {
    /**
     * Load identity provider with realm.
     *
     * @param protocol
     * @param realmKey
     */
    findByProtocol(protocol: IdentityProviderProtocol, realmKey?: string): Promise<IdentityProvider[]>
}
