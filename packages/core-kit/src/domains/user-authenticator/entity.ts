/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';
import type { User } from '../user';
import type { UserAuthenticatorKind } from './constants';

export interface UserAuthenticator {
    /**
     * Public ID
     */
    id: string;

    /**
     * Device row-type (totp, recovery, ...).
     */
    kind: `${UserAuthenticatorKind}`;

    /**
     * Free-form device label ("iPhone", "1Password") — NOT an identifier,
     * no canonical form.
     */
    name: string | null;

    /**
     * Kind-specific secret material. TOTP: symmetrically encrypted base32
     * seed. Never returned by any read endpoint.
     */
    secret: string | null;

    /**
     * Kind-specific parameters (JSON). TOTP: algorithm/digits/period.
     * WebAuthn: credential public key material.
     */
    parameters: string | null;

    /**
     * Recovery: JSON array of single-use hashed codes ({ hash, used_at }).
     * Never returned by any read endpoint.
     */
    codes: string | null;

    /**
     * Enrollment is two-step: create (unconfirmed) → confirm with a
     * valid code. Only confirmed devices satisfy a challenge.
     */
    confirmed: boolean;

    /**
     * Last successful challenge verification (iso).
     */
    last_used_at: string | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;

    // ------------------------------------------------------------------

    user_id: User['id'];

    user: User;

    /**
     * Denormalized from the owning user for realm-scope gating.
     */
    realm_id: Realm['id'];

    realm: Realm;
}
