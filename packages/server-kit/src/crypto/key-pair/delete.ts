/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import fs from 'node:fs';
import type { KeyPairOptions } from './type';
import { buildKeyFileName, extendKeyPairOptions } from './helpers';
import { KeyPairKind } from './constants';

export async function deleteKeyPair(context?: Partial<KeyPairOptions>) : Promise<void> {
    const options = extendKeyPairOptions(context);

    const privateKeyPath : string = path.resolve(options.directory, buildKeyFileName(KeyPairKind.PRIVATE, options));
    const publicKeyPath : string = path.resolve(options.directory, buildKeyFileName(KeyPairKind.PUBLIC, options));

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
