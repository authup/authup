/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import { randomUUID } from 'node:crypto';
import type { Identity } from '@authup/core-kit';
import { OAuth2OpenIDClaimsBuilder } from '../../../openid';
import type { OAuth2TokenSigner } from '../../signer';
import type { IOAuth2TokenRepository } from '../../types';
import type {
    OAuth2TokenIssuerOptions,
    OAuth2TokenIssuerResponse,
} from '../types';
import type { IOAuth2OpenIDTokenIssuer, OAuth2OpenIDTokenIssuerContext } from './types';
import type { IIdentityResolver } from '../../../../identity';

export class OAuth2OpenIDTokenIssuer implements IOAuth2OpenIDTokenIssuer {
    protected repository: IOAuth2TokenRepository;

    protected signer : OAuth2TokenSigner;

    readonly options: OAuth2TokenIssuerOptions;

    protected identityResolver : IIdentityResolver;

    protected claimsBuilder: OAuth2OpenIDClaimsBuilder;

    constructor(ctx: OAuth2OpenIDTokenIssuerContext) {
        this.repository = ctx.repository;
        this.signer = ctx.signer;
        this.options = ctx.options;

        this.identityResolver = ctx.identityResolver;
        this.claimsBuilder = new OAuth2OpenIDClaimsBuilder();
    }

    async issue(input: OAuth2TokenPayload = {}, options: OAuth2TokenIssuerOptions = {}) : Promise<OAuth2TokenIssuerResponse> {
        const identity = await this.identityResolver.resolve(
            input.sub_kind,
            input.sub,
        );

        return this.issueWithIdentity(input, identity, options);
    }

    async issueWithIdentity(input: OAuth2TokenPayload, identity: Identity, options?: OAuth2TokenIssuerOptions): Promise<OAuth2TokenIssuerResponse> {
        const claims = this.claimsBuilder.fromIdentity(identity);

        const utc = Math.floor(new Date().getTime() / 1000);

        const data = await this.repository.save({
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
