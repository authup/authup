/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { hasOwnProperty } from '@authelion/common';
import { KeyPairOptions } from '../type';

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

    options.save = typeof options.save === 'undefined' ||
        options.save;

    return options as KeyPairOptions;
}
