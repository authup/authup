/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    TokenECAlgorithm, TokenRSAAlgorithm, TokenSignECOptions, TokenSignOCTOptions, TokenSignOptions, TokenSignRSAOptions,
} from '@authup/server-kit';
import { signToken } from '@authup/server-kit';
import { KeyType, wrapPrivateKeyPem, wrapPublicKeyPem } from '@authup/core-kit';
import type { OAuth2OpenIdTokenPayload, OAuth2TokenPayload } from '@authup/core-kit';
import type { KeyEntity } from '../entity';

export async function signOAuth2TokenWithKey(
    payload: Partial<OAuth2TokenPayload | OAuth2OpenIdTokenPayload>,
    entity: KeyEntity,
    options?: Omit<TokenSignOptions, 'type' | 'algorithm' | 'keyPair' | 'secret'>,
) : Promise<string> {
    if (entity.type === KeyType.OCT) {
        return signToken(
            payload,
            {
                type: KeyType.OCT,
                key: Buffer.from(entity.decryption_key, 'base64'),
                ...options,
            } satisfies TokenSignOCTOptions,
        );
    }

    if (entity.type === KeyType.EC) {
        return signToken(
            payload,
            {
                type: entity.type,
                keyPair: {
                    publicKey: wrapPublicKeyPem(entity.encryption_key),
                    privateKey: wrapPrivateKeyPem(entity.decryption_key),
                },
                algorithm: entity.signature_algorithm as TokenECAlgorithm,
                ...options,
            } satisfies TokenSignECOptions,
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
            algorithm: entity.signature_algorithm as TokenRSAAlgorithm,
            ...options,
        } satisfies TokenSignRSAOptions,
    );
}
