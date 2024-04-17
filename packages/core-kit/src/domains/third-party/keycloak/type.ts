/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '../../../auth';

export type KeycloakJWTPayload = JWTClaims & {
    realm_access?: {
        roles?: string[]
    }
};
