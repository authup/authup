/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { KeyPairOptions } from './type';

export function buildKeyFileName(
    type: 'private' | 'public',
    alias?: string,
) {
    return `${(alias && alias.length > 0 ? `${alias}.` : '') + type}.key`;
}

export function buildKeyPairOptions(
    options?: Partial<KeyPairOptions>,
) : KeyPairOptions {
    options = options ?? {};
    options.directory = options.directory ??
        process.cwd();

    return {
        rsa: {
            modulusLength: 2048,
            ...(options.rsa ? options.rsa : {}),
        },
        alias: options.alias ?? 'default',
        directory: path.isAbsolute(options.directory) ?
            options.directory :
            path.resolve(process.cwd(), options.directory),
    };
}
