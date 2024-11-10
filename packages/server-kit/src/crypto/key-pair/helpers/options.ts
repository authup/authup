/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { KeyPairOptions } from '../type';

export function extendKeyPairOptions(
    options?: Partial<KeyPairOptions>,
) : KeyPairOptions {
    options = options ?? {};

    options.directory = options.directory || process.cwd();
    options.directory = path.isAbsolute(options.directory) ?
        options.directory :
        path.resolve(process.cwd(), options.directory);

    options.type ??= 'rsa';

    if (
        options.type === 'rsa' ||
        options.type === 'rsa-pss' ||
        options.type === 'dsa'
    ) {
        options.modulusLength = 2048;
    }

    if (!options.privateKeyEncoding) {
        options.privateKeyEncoding = {
            type: 'pkcs8',
            format: 'pem',
        };
    }

    if (!options.publicKeyEncoding) {
        options.publicKeyEncoding = {
            type: 'spki',
            format: 'pem',
        };
    }

    if (
        options.privateKeyEncoding.passphrase &&
        !options.privateKeyEncoding.cipher
    ) {
        options.privateKeyEncoding.cipher = 'aes-256-cbc';
    }

    return options as KeyPairOptions;
}
