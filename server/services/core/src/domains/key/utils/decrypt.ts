/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { constants, privateDecrypt } from 'node:crypto';
import { KeyType, wrapPrivateKeyPem } from '@authup/core';
import type { KeyEntity } from '../entity';

export function decryptWithKey(entity: KeyEntity, data: string | Buffer) : string {
    let key : string;
    if (entity.type === KeyType.OCT) {
        key = entity.decryption_key;
    } else {
        key = wrapPrivateKeyPem(entity.decryption_key);
    }

    let input : Buffer;
    if (typeof data === 'string') {
        input = Buffer.from(data, 'hex');
    } else {
        input = data;
    }

    const output = privateDecrypt({
        key,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    }, input);

    return output.toString('utf-8');
}
