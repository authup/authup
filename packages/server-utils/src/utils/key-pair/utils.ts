/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { KeyPairOptions } from './type';
import { KeyPairKind } from './constants';

export function buildKeyFileName(
    type: `${KeyPairKind}`,
    alias?: string,
) {
    return `${(alias || '') + type}.key`;
}

export function buildKeyPairOptions(
    options?: Partial<KeyPairOptions>,
) : KeyPairOptions {
    options = options ?? {};

    options.alias = options.alias || '';

    options.directory = options.directory || process.cwd();
    options.directory = path.isAbsolute(options.directory) ?
        options.directory :
        path.resolve(process.cwd(), options.directory);

    options.generator ??= {
        type: 'rsa',
        options: {
            modulusLength: 2048,
        },
    };

    return options;
}
