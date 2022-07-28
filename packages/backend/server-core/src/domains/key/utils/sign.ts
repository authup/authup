/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenSignOptions, signToken } from '@authelion/server-utils';
import { KeyType, wrapPrivateKeyPem, wrapPublicKeyPem } from '@authelion/common';
import { KeyEntity } from '../index';

export async function signOAuth2TokenWithKey(
    payload: string | object | Buffer | Record<string, any>,
    entity: KeyEntity,
    options?: Omit<TokenSignOptions, 'type' | 'algorithm' | 'keyPair' | 'secret'>,
) : Promise<string> {
    if (entity.type === KeyType.OCT) {
        return signToken(
            payload,
            {
                type: KeyType.OCT,
                secret: Buffer.from(entity.decryption_key, 'base64'),
                ...options,
            },
        );
    }

    return signToken(
        payload,
        {
            type: entity.type,
            keyPair: {
                publicKey: wrapPublicKeyPem(entity.encryption_key),
                privateKey: wrapPrivateKeyPem(entity.decryption_key),
            },
            algorithm: entity.signature_algorithm,
            ...options,
        } as TokenSignOptions,
    );
}
