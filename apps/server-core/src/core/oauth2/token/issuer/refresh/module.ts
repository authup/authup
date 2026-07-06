/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import type { IOAuth2TokenSigner } from '../../signer/index.ts';
import type { IOAuth2TokenRepository } from '../../repository/index.ts';
import type { ISessionTokenRepository } from '../../../session-token/index.ts';
import { OAuth2BaseTokenIssuer } from '../base.ts';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from '../types.ts';

export class OAuth2RefreshTokenIssuer extends OAuth2BaseTokenIssuer implements IOAuth2TokenIssuer {
    protected repository: IOAuth2TokenRepository;

    protected signer : IOAuth2TokenSigner;

    protected sessionTokenRepository?: ISessionTokenRepository;

    constructor(
        repository: IOAuth2TokenRepository,
        signer: IOAuth2TokenSigner,
        options: OAuth2TokenIssuerOptions = {},
        sessionTokenRepository?: ISessionTokenRepository,
    ) {
        super(options);

        this.repository = repository;
        this.signer = signer;
        this.sessionTokenRepository = sessionTokenRepository;
    }

    async issue(input: OAuth2TokenPayload = {}) : Promise<OAuth2TokenIssuerResponse> {
        const iss = this.buildIss(input);

        const data = await this.repository.insert({
            ...input,
            kind: OAuth2TokenKind.REFRESH,
            exp: this.buildExp(input),
            ...(iss ? { iss } : {}),
        });

        const token = await this.signer.sign(data);

        await this.repository.saveWithSignature(data, token);

        if (this.sessionTokenRepository && data.session_id && data.jti && typeof data.exp === 'number') {
            await this.sessionTokenRepository.create({
                id: data.jti,
                session_id: data.session_id,
                kind: 'refresh',
                parent_id: input.parent_id ?? null,
                ip_address: data.remote_address ?? '',
                user_agent: data.user_agent ?? '',
                expires_at: new Date(data.exp * 1000).toISOString(),
            });
        }

        return [token, data];
    }
}
