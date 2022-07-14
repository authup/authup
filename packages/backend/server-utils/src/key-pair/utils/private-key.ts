/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createPrivateKey } from 'crypto';
import { KeyPairContext } from '../type';

export function decryptRSAPrivateKey(
    context: KeyPairContext,
    key: string | Buffer,
) : string {
    const privateKey = createPrivateKey({
        type: context.options.privateKeyEncoding.type,
        format: context.options.privateKeyEncoding.format,
        key,
        passphrase: context.options.privateKeyEncoding.passphrase || context.passphrase,
    });

    let content = privateKey.export({
        type: context.options.privateKeyEncoding.type,
        format: context.options.privateKeyEncoding.format,
    });

    if (typeof content !== 'string') {
        content = Buffer.from(content).toString('utf-8');
    }

    return content;
}
