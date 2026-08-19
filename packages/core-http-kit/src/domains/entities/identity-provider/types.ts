/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordResponse, IEntityAPI } from '../../types-base';

import type { IdentityProvider, IdentityProviderAccount, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';

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

/**
 * Response of `POST /identity-providers/:id/link-request` (plan 091):
 * the external provider's authorize URL the browser navigates to.
 */
export type IdentityProviderLinkRequestResponse = {
    url: string,
};

/**
 * Body of `POST /identity-providers/:id/link-confirm` (issue #3439): the
 * one-time handle the callback returned on the account console URL. The
 * account row is written for the AUTHENTICATED caller, so the handle names
 * a pending link rather than authorizing one on its own.
 */
export type IdentityProviderLinkConfirmPayload = {
    handle: string,
};

/**
 * Body of `POST /identity-providers/:id/login-complete` (plan 094): the
 * one-time handle the federated callback put on the hosted authorize URL.
 * It is exchanged for the grant of the session the callback established,
 * so the hosted ladder can run MFA, the prompt gates and consent before
 * the RP's authorization code is issued.
 */
export type IdentityProviderLoginCompletePayload = {
    handle: string,
    /**
     * The challenge the login form minted before the hop to the external
     * provider and kept in the hosted origin's session storage. The callback
     * request's address and agent are chosen by whoever makes it, so this is
     * what ties the handle to the browser that started the login.
     */
    challenge: string,
};

export type IdentityProviderAuthorizeUriOptions = {
    codeRequest?: OAuth2AuthorizationCodeRequest
};

export interface IIdentityProviderAPI extends IEntityAPI<IdentityProvider, IdentityProviderCreatePayload, IdentityProviderUpdatePayload> {
    /**
     * The URL that starts a federated login through the provider. A login
     * needs the authorization code request it completes; without one the
     * server refuses to start it (`invalid_request`).
     */
    getAuthorizeUri(id: IdentityProvider['id'], options?: IdentityProviderAuthorizeUriOptions) : string;
    createOrUpdate(idOrName: string, data: IdentityProviderSavePayload) : Promise<EntityRecordResponse<IdentityProvider>>;
    createLinkRequest(id: IdentityProvider['id']) : Promise<IdentityProviderLinkRequestResponse>;
    confirmLinkRequest(id: IdentityProvider['id'], handle: string) : Promise<EntityRecordResponse<IdentityProviderAccount>>;
    completeLogin(id: IdentityProvider['id'], handle: string, challenge: string) : Promise<OAuth2TokenGrantResponse>;
}
