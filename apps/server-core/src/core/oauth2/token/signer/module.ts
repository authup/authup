/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type TokenECAlgorithm, type TokenRSAAlgorithm, signToken } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWKError, JWKType, JWKUse } from '@authup/specs';
import type { IKeyRepository } from '../../../key/index.ts';
import type { IOAuth2TokenSigner } from './types.ts';

export class OAuth2TokenSigner implements IOAuth2TokenSigner {
    protected keyRepository : IKeyRepository;

    constructor(keyRepository : IKeyRepository) {
        this.keyRepository = keyRepository;
    }

    async sign<T extends OAuth2TokenPayload>(payload: T) : Promise<string> {
        if (!payload.realm_id) {
            throw JWKError.invalidRealm();
        }

        const key = await this.keyRepository.findByRealmId(payload.realm_id, JWKUse.SIGNATURE);
        if (!key) {
            throw JWKError.notFoundForRealm(payload.realm_id, payload.realm_name);
        }

        if (!key.decryption_key) {
            throw JWKError.decryptionKeyMissing();
        }

        let token : string;
        if (key.type === JWKType.OCT) {
            token = await signToken(
                payload,
                {
                    type: JWKType.OCT,
                    key: key.decryption_key,
                    keyId: key.id,
                },
            );
        } else if (key.type === JWKType.EC) {
            token = await signToken(
                payload,
                {
                    type: key.type,
                    key: key.decryption_key,
                    algorithm: key.signature_algorithm as TokenECAlgorithm,
                    keyId: key.id,
                },
            );
        } else {
            token = await signToken(
                payload,
                {
                    type: key.type,
                    key: key.decryption_key,
                    algorithm: key.signature_algorithm as TokenRSAAlgorithm,
                    keyId: key.id,
                },
            );
        }

        return token;
    }
}
