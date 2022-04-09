/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DSAKeyPairOptions,
    ECKeyPairOptions,
    RSAKeyPairOptions,
    RSAPSSKeyPairOptions,
} from 'crypto';

export type KeyPair = {
    privateKey: string,
    publicKey: string
};

export type RSAKeyPairGenerator = {
    type?: 'rsa',
    options?: RSAKeyPairOptions<'pem', 'pem'>
};

export type RSAPSSKeyPairGenerator = {
    type?: 'rsa-pss',
    options?: RSAPSSKeyPairOptions<'pem', 'pem'>
};

export type DSAKeyPairGenerator = {
    type?: 'dsa',
    options?: DSAKeyPairOptions<'pem', 'pem'>
};

export type ECKeyPairGenerator = {
    type?: 'ec',
    options?: ECKeyPairOptions<'pem', 'pem'>,
};

export type KeyPairGenerator = DSAKeyPairGenerator |
RSAKeyPairGenerator |
RSAPSSKeyPairGenerator |
ECKeyPairGenerator;

export type KeyPairContext = {
    directory?: string,
    alias?: string,
    passphrase?: string,
    save?: boolean
} & KeyPairGenerator;
