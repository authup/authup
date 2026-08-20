/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type TokenECAlgorithm,
    type TokenRSAAlgorithm,
    extractTokenHeader,
    verifyToken,
} from '@authup/server-kit';
import { KeyStatus } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    JWKError,
    JWKType,
    JWKUse,
    JWTError,
} from '@authup/specs';
import type { IKeyStore } from '../../../key/index.ts';
import type { IOAuth2TokenRepository } from '../repository/types.ts';
import type { IOAuth2TokenVerifier, OAuth2TokenVerifyOptions } from './types.ts';

export class OAuth2TokenVerifier implements IOAuth2TokenVerifier {
    protected keyStore : IKeyStore;

    protected tokenRepository : IOAuth2TokenRepository;

    constructor(
        keyStore : IKeyStore,
        tokenRepository : IOAuth2TokenRepository,
    ) {
        this.keyStore = keyStore;
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

        // A `kid` that resolves to no usable verification key is a property of
        // the TOKEN, not a missing JWK resource: `JWKError.notFound` is the
        // right answer at `GET /jwks/:id`, and here it made a dead bearer 404
        // on every resource route, escape the refresh grant's `isJWTError`
        // catch as a 404 from `/token`, and drive the kit's http hook into its
        // terminal branch instead of a refresh - so a key rotation ended every
        // live browser session. It also stopped echoing the supplied `kid`.
        const key = await this.keyStore.resolveById(header.kid);
        if (!key) {
            throw JWTError.headerPropertyInvalid('kid');
        }

        // the key store also holds at-rest encryption keys (use: enc) —
        // those must never verify a token.
        if (key.use !== JWKUse.SIGNATURE) {
            throw JWTError.headerPropertyInvalid('kid');
        }

        // disabled = neither signs nor verifies (passive still verifies).
        if (key.status === KeyStatus.DISABLED) {
            throw JWTError.headerPropertyInvalid('kid');
        }

        switch (key.type) {
            case JWKType.OCT: {
                if (!key.decryptionKey) {
                    throw JWKError.decryptionKeyMissing();
                }

                payload = await verifyToken(
                    token,
                    {
                        type: JWKType.OCT,
                        key: key.decryptionKey,
                    },
                    { ignoreExpiry: options.ignoreExpiry },
                );
                break;
            }
            case JWKType.EC: {
                if (!key.encryptionKey) {
                    throw JWKError.decryptionKeyMissing();
                }

                payload = await verifyToken(
                    token,
                    {
                        type: key.type,
                        key: key.encryptionKey,
                        ...(
                            key.signatureAlgorithm ?
                                { algorithms: [key.signatureAlgorithm] } :
                                []
                        ) as TokenECAlgorithm[],
                    },
                    { ignoreExpiry: options.ignoreExpiry },
                );
                break;
            }
            default: {
                if (!key.encryptionKey) {
                    throw JWKError.decryptionKeyMissing();
                }

                payload = await verifyToken(
                    token,
                    {
                        type: key.type,
                        key: key.encryptionKey,
                        ...(
                            key.signatureAlgorithm ?
                                { algorithms: [key.signatureAlgorithm] } :
                                []
                        ) as TokenRSAAlgorithm[],
                    },
                    { ignoreExpiry: options.ignoreExpiry },
                );
            }
        }

        if (!payload.jti) {
            throw JWTError.payloadPropertyInvalid('jti');
        }

        // Never populate the shared signature-keyed claims cache on the
        // exp-ignoring path. An expired token verified with `ignoreExpiry`
        // (the RP-initiated-logout id_token_hint) would otherwise be re-cached
        // with buildTTL's 1h fallback (a past exp yields a non-positive ttl),
        // and the cache-first branch above returns it with no exp re-check on
        // every subsequent verify — so `/token/introspect` would report an
        // expired token as active for up to an hour (RFC 7662). Keep the
        // exp-bypass scoped to this single call.
        if (!options.ignoreExpiry) {
            await this.tokenRepository.saveWithSignature(payload, token);
        }

        if (!options.skipActiveCheck) {
            const isInactive = await this.isInactive(payload.jti);
            if (isInactive) {
                throw JWTError.notActive();
            }
        }

        return payload;
    }
}
