/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { JWTError, OAuth2TokenKind } from '@authup/specs';
import type { Identity } from '@authup/core-kit';
import { OAuth2OpenIDClaimsBuilder } from '../../../openid';
import type { IOAuth2TokenSigner } from '../../signer';
import type { IOAuth2TokenRepository } from '../../repository';
import { OAuth2BaseTokenIssuer } from '../base';
import type {
    OAuth2TokenIssuerResponse,
} from '../types';
import type { IOAuth2OpenIDTokenIssuer, OAuth2OpenIDTokenIssuerContext } from './types';
import type { IIdentityResolver } from '../../../../identity';

export class OAuth2OpenIDTokenIssuer extends OAuth2BaseTokenIssuer implements IOAuth2OpenIDTokenIssuer {
    protected repository: IOAuth2TokenRepository;

    protected signer : IOAuth2TokenSigner;

    protected identityResolver : IIdentityResolver;

    protected claimsBuilder: OAuth2OpenIDClaimsBuilder;

    constructor(ctx: OAuth2OpenIDTokenIssuerContext) {
        super(ctx.options);

        this.repository = ctx.repository;
        this.signer = ctx.signer;

        this.identityResolver = ctx.identityResolver;
        this.claimsBuilder = new OAuth2OpenIDClaimsBuilder();
    }

    async issue(input: OAuth2TokenPayload = {}) : Promise<OAuth2TokenIssuerResponse> {
        if (!input.sub_kind) {
            throw JWTError.payloadPropertyInvalid('sub_kind');
        }

        if (!input.sub) {
            throw JWTError.payloadPropertyInvalid('sub');
        }

        const identity = await this.identityResolver.resolve(
            input.sub_kind,
            input.sub,
        );

        if (!identity) {
            throw JWTError.payloadInvalid();
        }

        return this.issueWithIdentity(input, identity);
    }

    async issueWithIdentity(
        input: OAuth2TokenPayload,
        identity: Identity,
    ): Promise<OAuth2TokenIssuerResponse> {
        const claims = this.claimsBuilder.fromIdentity(identity);

        const utc = Math.floor(new Date().getTime() / 1000);

        const data = await this.repository.insert({
            ...input,
            ...claims,
            kind: OAuth2TokenKind.ID_TOKEN,
            auth_time: utc,
            exp: this.buildExp(input),
            updated_at: utc,
        });

        const token = await this.signer.sign(data);

        await this.repository.saveWithSignature(data, token);

        return [token, data];
    }
}
