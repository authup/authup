/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';

export type OAuth2TokenVerifyOptions = {
    skipActiveCheck?: boolean,
    /**
     * Skip ONLY the `exp` check (signature, issuer, nbf still enforced). For
     * verifying an `id_token_hint` on RP-initiated logout, which is routinely
     * expired by the time the user logs out.
     */
    ignoreExpiry?: boolean
};

export interface IOAuth2TokenVerifier {
    isInactive(token: string) : Promise<boolean>;

    verify(token: string, options?: OAuth2TokenVerifyOptions) : Promise<OAuth2TokenPayload>
}
