/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { generateKeyPair } from 'node:crypto';
import type { KeyPair, KeyPairOptions } from './type';
import { decryptRSAPrivateKey, extendKeyPairOptions } from './helpers';
import { saveKeyPair } from './save';

export async function createKeyPair(context?: Partial<KeyPairOptions>) : Promise<KeyPair> {
    const options = extendKeyPairOptions(context);

    const keyPair : KeyPair = await new Promise((resolve: (value: KeyPair) => void, reject) => {
        const callback = (err: (Error | null), publicKey: string, privateKey: string) => {
            if (err) reject(err);

            resolve({
                privateKey,
                publicKey,
            });
        };
        switch (options.type) {
            case 'dsa':
                generateKeyPair(
                    options.type,
                    options,
                    callback,
                );
                break;
            case 'ec':
                generateKeyPair(
                    options.type,
                    options,
                    callback,
                );
                break;
            case 'rsa':
                generateKeyPair(
                    options.type,
                    options,
                    callback,
                );
                break;
            case 'rsa-pss':
                generateKeyPair(
                    options.type,
                    options,
                    callback,
                );
                break;
        }
    });

    if (options.save) {
        await saveKeyPair(keyPair, options);
    }

    if (
        options.passphrase ||
        options.privateKeyEncoding.passphrase
    ) {
        keyPair.privateKey = decryptRSAPrivateKey(
            options,
            keyPair.privateKey,
        );
    }

    return keyPair;
}
