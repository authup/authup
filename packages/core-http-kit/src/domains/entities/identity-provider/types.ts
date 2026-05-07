/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';

// Mirrors `IdentityProviderValidator` mounts in @authup/core-kit. IdPs carry per-protocol
// attributes (e.g. client_id/client_secret for OAuth2) handled by an attributes validator
// outside the main schema; the `& Record<string, any>` keeps those open.
type IdentityProviderValidatedFields =    & Pick<IdentityProvider, 'name' | 'enabled' | 'protocol'> &
    Partial<Pick<IdentityProvider, 'display_name' | 'realm_id' | 'preset'>>;
export type IdentityProviderCreatePayload = IdentityProviderValidatedFields & Record<string, any>;
export type IdentityProviderUpdatePayload = Partial<IdentityProviderValidatedFields> & Record<string, any>;
export type IdentityProviderSavePayload = IdentityProviderCreatePayload;
