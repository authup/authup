/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationDocument } from '@authup/access';
import type { AuthorizationHeader } from 'hapic';

export type AuthorizationRequestOptions = {
    /**
     * Read the document for another credential than the client's own, the way
     * the kit store hands over the access token it is staging a session for.
     */
    authorizationHeader?: string | AuthorizationHeader,
};

export interface IAuthorizationAPI {
    get(options?: AuthorizationRequestOptions) : Promise<AuthorizationDocument>;
}
