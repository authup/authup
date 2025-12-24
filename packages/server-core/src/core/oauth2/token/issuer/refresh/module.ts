/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { OAuth2TokenKind } from '@authup/specs';
import type { IOAuth2TokenSigner } from '../../signer';
import type { IOAuth2TokenRepository } from '../../repository';
import { OAuth2BaseTokenIssuer } from '../base';
import type { IOAuth2TokenIssuer, OAuth2TokenIssuerOptions, OAuth2TokenIssuerResponse } from '../types';

export class OAuth2RefreshTokenIssuer extends OAuth2BaseTokenIssuer implements IOAuth2TokenIssuer {
    protected repository: IOAuth2TokenRepository;

    protected signer : IOAuth2TokenSigner;

    constructor(
        repository: IOAuth2TokenRepository,
        signer: IOAuth2TokenSigner,
        options: OAuth2TokenIssuerOptions = {},
    ) {
        super(options);

        this.repository = repository;
        this.signer = signer;
    }

    async issue(input: OAuth2TokenPayload = {}) : Promise<OAuth2TokenIssuerResponse> {
        const data = await this.repository.insert({
            ...input,
            kind: OAuth2TokenKind.REFRESH,
            exp: this.buildExp(input),
        });

        const token = await this.signer.sign(data);

        await this.repository.saveWithSignature(data, token);

        return [token, data];
    }
}
