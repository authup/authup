/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { generateKeyPair } from 'crypto';
import { KeyPair, KeyPairContext } from './type';
import { decryptRSAPrivateKey, extendKeyPairContext } from './utils';
import { saveKeyPair } from './save';

export async function createKeyPair(context?: KeyPairContext) : Promise<KeyPair> {
    context = extendKeyPairContext(context);

    const keyPair : KeyPair = await new Promise((resolve: (value: KeyPair) => void, reject) => {
        const callback = (err: Error, publicKey: string, privateKey: string) => {
            if (err) reject(err);

            resolve({
                privateKey,
                publicKey,
            });
        };
        switch (context.type) {
            case 'dsa':
                generateKeyPair(
                    context.type,
                    context.options,
                    callback,
                );
                break;
            case 'ec':
                generateKeyPair(
                    context.type,
                    context.options,
                    callback,
                );
                break;
            case 'rsa':
                generateKeyPair(
                    context.type,
                    context.options,
                    callback,
                );
                break;
            case 'rsa-pss':
                generateKeyPair(
                    context.type,
                    context.options,
                    callback,
                );
                break;
        }
    });

    if (context.save) {
        await saveKeyPair(keyPair, context);
    }

    if (
        context.passphrase ||
        context.options.privateKeyEncoding.passphrase
    ) {
        keyPair.privateKey = decryptRSAPrivateKey(
            context,
            keyPair.privateKey,
        );
    }

    return keyPair;
}
