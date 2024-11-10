/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import fs from 'node:fs';
import type { KeyPair, KeyPairOptions } from './type';
import { buildKeyFileName, extendKeyPairOptions } from './helpers';
import { KeyPairKind } from './constants';

export async function saveKeyPair(keyPair: KeyPair, context?: KeyPairOptions) : Promise<KeyPair> {
    context = extendKeyPairOptions(context);

    await fs.promises.mkdir(context.directory, { recursive: true });

    await Promise.all(
        [
            {
                path: path.resolve(context.directory, buildKeyFileName(KeyPairKind.PRIVATE, context)),
                content: keyPair.privateKey,
            },
            {
                path: path.resolve(context.directory, buildKeyFileName(KeyPairKind.PUBLIC, context)),
                content: keyPair.publicKey,
            },
        ]
            .map((file) => fs.promises.writeFile(file.path, file.content)),
    );

    return keyPair;
}
