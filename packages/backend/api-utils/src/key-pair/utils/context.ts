/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { KeyPairContext } from '../type';

export function extendKeyPairContext(
    context?: KeyPairContext,
) : KeyPairContext {
    context = context ?? {};

    context.alias = context.alias || '';

    context.directory = context.directory || process.cwd();
    context.directory = path.isAbsolute(context.directory) ?
        context.directory :
        path.resolve(process.cwd(), context.directory);

    context.type ??= 'rsa';
    context.options ??= {
        modulusLength: 2048,
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
    };

    if (context.passphrase) {
        context.options.privateKeyEncoding.passphrase = context.passphrase;
    }

    if (
        context.options.privateKeyEncoding.passphrase &&
        !context.options.privateKeyEncoding.cipher
    ) {
        context.options.privateKeyEncoding.cipher = 'aes-256-cbc';
    }

    return context;
}
