/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Lifecycle state of a key (Keycloak-style rotation semantics):
 * active keys sign/encrypt and verify/decrypt, passive keys only
 * verify/decrypt (rotated out, kept for existing artifacts),
 * disabled keys do neither.
 */
export enum KeyStatus {
    ACTIVE = 'active',
    PASSIVE = 'passive',
    DISABLED = 'disabled',
}
