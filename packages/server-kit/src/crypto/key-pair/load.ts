/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createPublicKey } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import type { KeyPair, KeyPairOptions } from './type';
import { buildKeyFileName, decryptRSAPrivateKey, extendKeyPairOptions } from './helpers';
import { KeyPairKind } from './constants';
import { saveKeyPair } from './save';

export async function loadKeyPair(context?: Partial<KeyPairOptions>) : Promise<KeyPair | undefined> {
    const options = extendKeyPairOptions(context);

    const privateKeyPath : string = path.resolve(options.directory, buildKeyFileName(KeyPairKind.PRIVATE, options));

    try {
        await fs.promises.stat(privateKeyPath);
    } catch (e) {
        return undefined;
    }

    const privateKeyBuffer = await fs.promises.readFile(privateKeyPath);
    let privateKey = privateKeyBuffer.toString();
    if (
        options.passphrase ||
        options.privateKeyEncoding.passphrase
    ) {
        privateKey = decryptRSAPrivateKey(
            options,
            privateKey,
        );
    }

    const publicKeyPath : string = path.resolve(options.directory, buildKeyFileName(KeyPairKind.PUBLIC, options));

    let publicKey : string;

    try {
        await fs.promises.stat(publicKeyPath);
        const publicKeyBuffer = await fs.promises.readFile(publicKeyPath);
        publicKey = publicKeyBuffer.toString();
    } catch (e) {
        const publicKeyObject = createPublicKey({
            key: privateKey,
            format: options.privateKeyEncoding.format,
            type: options.publicKeyEncoding.type,
        });

        const stringOrBuffer = publicKeyObject.export({
            format: options.publicKeyEncoding.format,
            type: options.publicKeyEncoding.type,
        });
        if (typeof stringOrBuffer !== 'string') {
            publicKey = stringOrBuffer.toString();
        } else {
            publicKey = stringOrBuffer;
        }

        if (options.save) {
            await saveKeyPair({
                privateKey,
                publicKey,
            }, options);
        }
    }

    return {
        privateKey,
        publicKey,
    };
}
