/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DSAKeyPairKeyObjectOptions,
    ECKeyPairKeyObjectOptions,
    RSAKeyPairKeyObjectOptions, RSAPSSKeyPairKeyObjectOptions,
} from 'crypto';

export type KeyPair = {
    privateKey: string,
    publicKey: string
};

export type RSAKeyPairGenerator = {
    type: 'rsa',
    options?: RSAKeyPairKeyObjectOptions
};

export type RSAPSSKeyPairGenerator = {
    type: 'rsa-pss',
    options?: RSAPSSKeyPairKeyObjectOptions
};

export type DSAKeyPairGenerator = {
    type: 'dsa',
    options?: DSAKeyPairKeyObjectOptions
};

export type ECKeyPairGenerator = {
    type: 'ec',
    options?: ECKeyPairKeyObjectOptions,
};

export type KeyPairGenerator = DSAKeyPairGenerator |
RSAKeyPairGenerator |
RSAPSSKeyPairGenerator |
ECKeyPairGenerator;

export type KeyPairOptions = {
    directory?: string,
    alias?: string,
    generator?: KeyPairGenerator
};
