/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyType, wrapPublicKeyPem } from '@authup/core';
import { constants, publicEncrypt } from 'node:crypto';
import type { KeyEntity } from '../entity';

export function encryptWithKey(entity: KeyEntity, data: string | Buffer) : string {
    let key : string;
    if (entity.type === KeyType.OCT) {
        key = entity.decryption_key;
    } else {
        key = wrapPublicKeyPem(entity.encryption_key);
    }

    let input : Buffer;
    if (typeof data === 'string') {
        input = Buffer.from(data);
    } else {
        input = data;
    }

    const output = publicEncrypt({
        key,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    }, input);

    return output.toString('hex');
}
