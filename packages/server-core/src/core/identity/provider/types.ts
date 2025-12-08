/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, User } from '@authup/core-kit';
import type { IdentityProviderIdentityOperation } from './constants';

export type IdentityProviderIdentity = {
    id: string,

    /**
     * Client used for authentication
     */
    clientId?: string,

    /**
     * Required for ldap authentication
     */
    roles?: string[],

    /**
     * Attribute candidates discovered during
     * authentication step (ldap, oauth2, ...)
     */
    attributeCandidates?: {
        [K in keyof User]?: unknown[]
    },

    /**
     * Raw data received from identity provider.
     */
    data: Record<string, any>,

    provider: IdentityProvider,

    operation?: IdentityProviderIdentityOperation,
};
