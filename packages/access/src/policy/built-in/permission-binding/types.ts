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
 * The token an identity's grants are resolved for (#3597).
 */
export type IdentityTokenOptions = {
    /**
     * The client the token was issued to: its `client_id` claim. A property
     * of the TOKEN, never the subject's own client
     * (`IdentityPolicyData.clientId`) and never the definition selector
     * (`PermissionEvaluationContext.clientId`).
     *
     * A user's grants owned by another client are withheld under it, roles
     * included. `null` is a request without a token client, which narrows
     * nothing. Required, so no caller widens a request by leaving it out.
     */
    tokenClientId: string | null,
};
