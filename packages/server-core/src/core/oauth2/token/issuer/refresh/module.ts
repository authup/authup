/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import type { OAuth2TokenSigner } from '../../signer';
import type { IOAuth2TokenRepository } from '../../types';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from '../types';

export class OAuth2RefreshTokenIssuer implements IOAuth2TokenIssuer {
    protected repository: IOAuth2TokenRepository;

    protected signer : OAuth2TokenSigner;

    protected options: OAuth2TokenIssuerOptions;

    constructor(
        repository: IOAuth2TokenRepository,
        signer: OAuth2TokenSigner,
        options: OAuth2TokenIssuerOptions = {},
    ) {
        this.repository = repository;
        this.signer = signer;
        this.options = options;
    }

    async issue(input: OAuth2TokenPayload = {}, options: OAuth2TokenIssuerOptions = {}) : Promise<OAuth2TokenIssuerResponse> {
        const data = await this.repository.save({
            ...input,
            kind: OAuth2TokenKind.REFRESH,
            exp: input.exp ||
                Math.floor(new Date().getTime() / 1000) + (
                    options.maxAge || this.options.maxAge || 3600
                ),
        });

        const token = await this.signer.sign(data);

        await this.repository.saveWithSignature(data, token);

        return [token, data];
    }
}
