/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import fs from 'fs';
import { KeyPair, KeyPairContext } from './type';
import { buildKeyFileName, decryptRSAPrivateKey, extendKeyPairContext } from './utils';
import { KeyPairKind } from './constants';

export async function loadKeyPair(context?: KeyPairContext) : Promise<KeyPair | undefined> {
    context = extendKeyPairContext(context);

    const privateKeyPath : string = path.resolve(context.directory, buildKeyFileName(KeyPairKind.PRIVATE, context.alias));
    const publicKeyPath : string = path.resolve(context.directory, buildKeyFileName(KeyPairKind.PUBLIC, context.alias));

    try {
        await Promise.all([privateKeyPath, publicKeyPath]
            .map((filePath) => fs.promises.stat(filePath)));
    } catch (e) {
        return undefined;
    }

    const filesContent : Buffer[] = await Promise.all([
        privateKeyPath,
        publicKeyPath,
    ].map((filePath) => fs.promises.readFile(filePath)));

    let privateKey : string = filesContent[0].toString();
    if (
        context.passphrase ||
        context.options.privateKeyEncoding.passphrase
    ) {
        privateKey = decryptRSAPrivateKey(
            context,
            privateKey,
        );
    }

    const publicKey : string = filesContent[1].toString();

    return {
        privateKey,
        publicKey,
    };
}
