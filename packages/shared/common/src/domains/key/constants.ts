/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum KeyType {
    /**
     * Octet/Byte sequence (used to represent symmetric keys)
     */
    OCT = 'oct',
    /**
     * RSA
     */
    RSA = 'rsa',
    /**
     * Elliptic Curve
     */
    EC = 'ec',
}

export enum KeyStatus {
    ACTIVE = 'active',
    PASSIVE = 'passive',
    DISABLED = 'disabled',
}
