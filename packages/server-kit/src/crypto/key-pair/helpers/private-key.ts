/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createPrivateKey } from 'node:crypto';
import type { KeyPairOptions } from '../type';

export function decryptRSAPrivateKey(
    context: KeyPairOptions,
    key: string | Buffer,
) : string {
    const privateKey = createPrivateKey({
        type: context.privateKeyEncoding.type,
        format: context.privateKeyEncoding.format,
        key,
        passphrase: context.privateKeyEncoding.passphrase || context.passphrase,
    });

    let content = privateKey.export({
        type: context.privateKeyEncoding.type,
        format: context.privateKeyEncoding.format,
    });

    if (typeof content !== 'string') {
        content = Buffer.from(content).toString('utf-8');
    }

    return content;
}
