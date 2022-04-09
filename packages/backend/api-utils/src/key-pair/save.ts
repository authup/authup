/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import fs from 'fs';
import { KeyPair, KeyPairContext } from './type';
import { buildKeyFileName, extendKeyPairContext } from './utils';
import { KeyPairKind } from './constants';

export async function saveKeyPair(keyPair: KeyPair, context?: KeyPairContext) : Promise<KeyPair> {
    context = extendKeyPairContext(context);

    await Promise.all(
        [
            {
                path: path.resolve(context.directory, buildKeyFileName(KeyPairKind.PRIVATE, context.alias)),
                content: keyPair.privateKey,
            },
            {
                path: path.resolve(context.directory, buildKeyFileName(KeyPairKind.PUBLIC, context.alias)),
                content: keyPair.publicKey,
            },
        ]
            .map((file) => fs.promises.writeFile(file.path, file.content)),
    );

    return keyPair;
}
