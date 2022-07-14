/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import fs from 'fs';
import { KeyPairContext } from './type';
import { buildKeyFileName, extendKeyPairContext } from './utils';
import { KeyPairKind } from './constants';

export async function deleteKeyPair(context?: KeyPairContext) : Promise<void> {
    context = extendKeyPairContext(context);

    const privateKeyPath : string = path.resolve(context.directory, buildKeyFileName(KeyPairKind.PRIVATE, context));
    const publicKeyPath : string = path.resolve(context.directory, buildKeyFileName(KeyPairKind.PUBLIC, context));

    try {
        await Promise.all([privateKeyPath, publicKeyPath]
            .map((filePath) => fs.promises.stat(filePath)));
    } catch (e) {
        return;
    }

    await Promise.all([
        privateKeyPath,
        publicKeyPath,
    ].map((filePath) => fs.promises.rm(filePath)));
}
