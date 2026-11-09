/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Logger } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    JWKError,
    JWKType,
    OAuth2ServerError,
    OAuth2TokenKind,
} from '@authup/specs';
import type { IOAuth2TokenSigner } from '../../signer/index.ts';
import { OAuth2BaseTokenIssuer } from '../base.ts';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from '../types.ts';

/**
 * Issues the delegated capability token of the RFC 8693 grant. Unlike the
 * other issuers it holds no token repository: a capability token is never
 * persisted, so ending the subject's session does not reach it and only its
 * short lifetime bounds it.
 */
export class OAuth2CapabilityTokenIssuer extends OAuth2BaseTokenIssuer implements IOAuth2TokenIssuer {
    protected signer : IOAuth2TokenSigner;

    protected logger? : Logger;

    constructor(
        signer: IOAuth2TokenSigner,
        options: OAuth2TokenIssuerOptions = {},
        logger?: Logger,
    ) {
        super(options);

        this.signer = signer;
        this.logger = logger;
    }

    async issue(input: OAuth2TokenPayload = {}) : Promise<OAuth2TokenIssuerResponse> {
        if (!input.realm_id) {
            throw JWKError.invalidRealm();
        }

        const iss = this.buildIss(input);

        const data : OAuth2TokenPayload = {
            ...input,
            kind: OAuth2TokenKind.CAPABILITY,
            jti: randomUUID(),
            exp: this.buildExp(input),
            ...(iss ? { iss } : {}),
        };

        const token = await this.signer.sign(data, {
            // A resource server verifies this token against /jwks, which
            // publishes asymmetric keys only: a token signed with an OCT key
            // could never be verified by the party it is issued for.
            assertKey: (key) => {
                if (key.type !== JWKType.OCT) {
                    return;
                }

                this.logger?.error(`token exchange requires an asymmetric signing key in realm ${input.realm_name ?? input.realm_id}`);

                throw new OAuth2ServerError({ message: 'The realm cannot sign a capability token.' });
            },
        });

        return [token, data];
    }
}
