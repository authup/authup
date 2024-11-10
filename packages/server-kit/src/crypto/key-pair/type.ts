/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    DSAKeyPairOptions,
    ECKeyPairOptions,
    RSAKeyPairOptions,
    RSAPSSKeyPairOptions,
} from 'node:crypto';

export type KeyPair = {
    privateKey: string,
    publicKey: string
};

export type RSAKeyPairGenerator = {
    type: 'rsa'
} & RSAKeyPairOptions<'pem', 'pem'>;

export type RSAPSSKeyPairGenerator = {
    type: 'rsa-pss',
} & RSAPSSKeyPairOptions<'pem', 'pem'>;

export type DSAKeyPairGenerator = {
    type: 'dsa'
} & DSAKeyPairOptions<'pem', 'pem'>;

export type ECKeyPairGenerator = {
    type: 'ec',
} & ECKeyPairOptions<'pem', 'pem'>;

export type KeyPairGenerator = DSAKeyPairGenerator |
RSAKeyPairGenerator |
RSAPSSKeyPairGenerator |
ECKeyPairGenerator;

export type KeyPairBaseOptions = {
    /**
     * Directory where to save key-pair.
     *
     * default: process.cwd()
     */
    directory: string,
    /**
     * Private key name
     *
     * default: private
     */
    privateName: string,
    /**
     * Extension for private key.
     *
     * default: pem
     */
    privateExtension: string,
    /**
     * Public key name
     *
     * default: public
     */
    publicName: string,
    /**
     * Extension for public key.
     *
     * default: pem
     */
    publicExtension: string,
    /**
     * Passphrase for private key.
     *
     * default: undefined
     */
    passphrase: string,
    /**
     * Save key-pair to file system.
     *
     * default: false
     */
    save: boolean
};

export type KeyPairOptions = KeyPairBaseOptions & KeyPairGenerator;
