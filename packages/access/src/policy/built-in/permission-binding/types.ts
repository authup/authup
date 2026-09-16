/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '../../types';

export interface PermissionBindingPolicy extends BasePolicy {

}

/**
 * The credential an identity's grants are resolved for (#3597).
 */
export type IdentityCredentialOptions = {
    /**
     * The client the credential was issued to: a token's `client_id`. A
     * PROPERTY OF THE CREDENTIAL, never the subject's own client
     * (`IdentityPolicyData.clientId`) and never the definition selector
     * (`PermissionEvaluationContext.clientId`).
     *
     * A user's grants owned by another client are withheld under it, roles
     * included. `null` is a credential issued to no client, which narrows
     * nothing. Required, so no caller widens a credential by leaving it out.
     */
    credentialClientId: string | null,
};
