/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordResponse, IEntityAPI } from '../../types-base';

import type { IdentityProvider } from '@authup/core-kit';

// Mirrors `IdentityProviderValidator` mounts in @authup/core-kit. IdPs carry per-protocol
// attributes (e.g. clientId/clientSecret for OAuth2) handled by an attributes validator
// outside the main schema; the `& Record<string, any>` keeps those open.
//
// `protocol` is mounted unconditionally (no group filter, no `optional: true`), so the
// validator demands it on both CREATE and UPDATE — UpdatePayload reflects that.
export type IdentityProviderCreatePayload = Pick<IdentityProvider, 'name' | 'enabled' | 'protocol'> &
    Partial<Pick<IdentityProvider, 'displayName' | 'realmId' | 'preset'>> &
    Record<string, any>;
export type IdentityProviderUpdatePayload = Pick<IdentityProvider, 'protocol'> &
    Partial<Pick<IdentityProvider, 'name' | 'enabled' | 'displayName' | 'realmId' | 'preset'>> &
    Record<string, any>;
export type IdentityProviderSavePayload = IdentityProviderCreatePayload;

export interface IIdentityProviderAPI extends IEntityAPI<IdentityProvider, IdentityProviderCreatePayload, IdentityProviderUpdatePayload> {
    getAuthorizeUri(id: IdentityProvider['id']) : string;
    createOrUpdate(idOrName: string, data: IdentityProviderSavePayload) : Promise<EntityRecordResponse<IdentityProvider>>;
}
