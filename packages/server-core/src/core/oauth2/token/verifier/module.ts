/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type TokenECAlgorithm, type TokenRSAAlgorithm, extractTokenHeader, verifyToken,
} from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWKError, JWKType, JWTError } from '@authup/specs';
import type { IOAuth2KeyRepository } from '../../key';
import type { IOAuth2TokenRepository } from '../repository/types';
import type { IOAuth2TokenVerifier, OAuth2TokenVerifyOptions } from './types';

export class OAuth2TokenVerifier implements IOAuth2TokenVerifier {
    protected keyRepository : IOAuth2KeyRepository;

    protected tokenRepository : IOAuth2TokenRepository;

    constructor(
        keyRepository : IOAuth2KeyRepository,
        tokenRepository : IOAuth2TokenRepository,
    ) {
        this.keyRepository = keyRepository;
        this.tokenRepository = tokenRepository;
    }

    async isInactive(id: string): Promise<boolean> {
        return this.tokenRepository.isInactive(id);
    }

    async verify(token: string, options: OAuth2TokenVerifyOptions = {}) : Promise<OAuth2TokenPayload> {
        let payload = await this.tokenRepository.findOneBySignature(token);
        if (payload) {
            if (!payload.jti) {
                throw JWTError.payloadPropertyInvalid('jti');
            }

            if (!options.skipActiveCheck) {
                const isInactive = await this.isInactive(payload.jti);
                if (isInactive) {
                    throw JWTError.notActive();
                }
            }

            return payload;
        }

        const header = extractTokenHeader(token);
        if (!header.kid) {
            throw JWTError.headerPropertyInvalid('kid');
        }

        const key = await this.keyRepository.findById(header.kid);
        if (!key) {
            throw JWKError.notFound(header.kid);
        }

        switch (key.type) {
            case JWKType.OCT: {
                if (!key.decryption_key) {
                    throw JWKError.decryptionKeyMissing();
                }

                payload = await verifyToken(
                    token,
                    {
                        type: JWKType.OCT,
                        key: key.decryption_key,
                    },
                );
                break;
            }
            case JWKType.EC: {
                if (!key.encryption_key) {
                    throw JWKError.decryptionKeyMissing();
                }

                payload = await verifyToken(
                    token,
                    {
                        type: key.type,
                        key: key.encryption_key,
                        ...(
                            key.signature_algorithm ?
                                { algorithms: [key.signature_algorithm] } :
                                []
                        ) as TokenECAlgorithm[],
                    },
                );
                break;
            }
            default: {
                if (!key.encryption_key) {
                    throw JWKError.decryptionKeyMissing();
                }

                payload = await verifyToken(
                    token,
                    {
                        type: key.type,
                        key: key.encryption_key,
                        ...(
                            key.signature_algorithm ?
                                { algorithms: [key.signature_algorithm] } :
                                []
                        ) as TokenRSAAlgorithm[],
                    },
                );
            }
        }

        if (!payload.jti) {
            throw JWTError.payloadPropertyInvalid('jti');
        }

        await this.tokenRepository.saveWithSignature(payload, token);

        if (!options.skipActiveCheck) {
            const isActive = await this.isInactive(payload.jti);
            if (!isActive) {
                throw JWTError.notActive();
            }
        }

        return payload;
    }
}
