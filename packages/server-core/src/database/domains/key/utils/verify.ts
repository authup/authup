/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TokenVerifyOptions } from '@authup/server-kit';
import {
    verifyToken,
    wrapPrivateKeyPem, wrapPublicKeyPem,
} from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/kit';
import { JWKType } from '@authup/kit';
import type { KeyEntity } from '../entity';

export async function verifyOAuth2TokenWithKey(
    token: string,
    entity: KeyEntity,
) : Promise<OAuth2TokenPayload> {
    if (entity.type === JWKType.OCT) {
        return verifyToken(
            token,
            {
                type: JWKType.OCT,
                key: Buffer.from(entity.decryption_key, 'base64'),
            },
        );
    }

    return verifyToken(
        token,
        {
            type: entity.type,
            keyPair: {
                publicKey: wrapPublicKeyPem(entity.encryption_key),
                privateKey: wrapPrivateKeyPem(entity.decryption_key),
            },
            ...(entity.signature_algorithm ? { algorithms: [entity.signature_algorithm] } : []),
        } as TokenVerifyOptions,
    );
}
