/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';

export type IdentityProviderCreateInput = Partial<IdentityProvider>;
export type IdentityProviderUpdateInput = Partial<IdentityProvider>;
export type IdentityProviderSaveInput = Partial<IdentityProvider>;
export type IdentityProviderResponse = IdentityProvider;
