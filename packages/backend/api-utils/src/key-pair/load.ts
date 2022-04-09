/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createPublicKey } from 'crypto';
import path from 'path';
import fs from 'fs';
import { KeyPair, KeyPairContext } from './type';
import { buildKeyFileName, decryptRSAPrivateKey, extendKeyPairContext } from './utils';
import { KeyPairKind } from './constants';
import { saveKeyPair } from './save';

export async function loadKeyPair(context?: KeyPairContext) : Promise<KeyPair | undefined> {
    context = extendKeyPairContext(context);

    const privateKeyPath : string = path.resolve(context.directory, buildKeyFileName(KeyPairKind.PRIVATE, context));

    try {
        await fs.promises.stat(privateKeyPath);
    } catch (e) {
        return undefined;
    }

    const privateKeyBuffer = await fs.promises.readFile(privateKeyPath);
    let privateKey = privateKeyBuffer.toString();
    if (
        context.passphrase ||
        context.options.privateKeyEncoding.passphrase
    ) {
        privateKey = decryptRSAPrivateKey(
            context,
            privateKey,
        );
    }

    const publicKeyPath : string = path.resolve(context.directory, buildKeyFileName(KeyPairKind.PUBLIC, context));

    let publicKey : string;

    try {
        await fs.promises.stat(privateKeyPath);
        const publicKeyBuffer = await fs.promises.readFile(publicKeyPath);
        publicKey = publicKeyBuffer.toString();
    } catch (e) {
        const publicKeyObject = createPublicKey({
            key: privateKey,
            format: context.options.privateKeyEncoding.format,
            type: context.options.publicKeyEncoding.type,
        });

        const stringOrBuffer = publicKeyObject.export({
            format: context.options.publicKeyEncoding.format,
            type: context.options.publicKeyEncoding.type,
        });
        if (typeof stringOrBuffer !== 'string') {
            publicKey = stringOrBuffer.toString();
        } else {
            publicKey = stringOrBuffer;
        }

        await saveKeyPair({
            privateKey,
            publicKey,
        }, context);
    }

    return {
        privateKey,
        publicKey,
    };
}
