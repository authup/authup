/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import { randomUUID } from 'node:crypto';
import { OAuth2IdentityResolver } from '../../../identity';
import { OAuth2OpenIDClaimsBuilder } from '../../../openid';
import type { OAuth2TokenSigner } from '../../signer';
import type { IOAuth2TokenRepository } from '../../types';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from '../types';

export class OAuth2OpenIDTokenIssuer implements IOAuth2TokenIssuer {
    protected repository: IOAuth2TokenRepository;

    protected signer : OAuth2TokenSigner;

    protected options: OAuth2TokenIssuerOptions;

    protected identityResolver : OAuth2IdentityResolver;

    protected claimsBuilder: OAuth2OpenIDClaimsBuilder;

    constructor(
        repository: IOAuth2TokenRepository,
        signer: OAuth2TokenSigner,
        options: OAuth2TokenIssuerOptions = {},
    ) {
        this.repository = repository;
        this.signer = signer;
        this.options = options;

        this.identityResolver = new OAuth2IdentityResolver();
        this.claimsBuilder = new OAuth2OpenIDClaimsBuilder();
    }

    async issue(input: OAuth2TokenPayload = {}, options: OAuth2TokenIssuerOptions = {}) : Promise<OAuth2TokenIssuerResponse> {
        const identity = await this.identityResolver.resolve(input);
        const claims = this.claimsBuilder.fromIdentity(identity);

        const utc = Math.floor(new Date().getTime() / 1000);

        const data = this.repository.save({
            ...input,
            ...claims,
            jti: input.jti || randomUUID(),
            kind: OAuth2TokenKind.ID_TOKEN,
            auth_time: utc,
            exp: utc + (options.maxAge || this.options.maxAge || 3600),
            updated_at: utc,
        });

        const token = await this.signer.sign(data);

        await this.repository.saveWithSignature(data, token);

        return [token, data];
    }
}
