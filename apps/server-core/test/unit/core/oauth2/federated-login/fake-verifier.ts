/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type {
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeRequestVerificationResult,
} from '../../../../../src/core/oauth2/authorization/index.ts';

export class FakeVerifier implements IOAuth2AuthorizationCodeRequestVerifier {
    public calls : OAuth2AuthorizationCodeRequest[] = [];

    constructor(
        protected result: Partial<OAuth2AuthorizationCodeRequestVerificationResult> | Error,
    ) {}

    async verify(data: OAuth2AuthorizationCodeRequest) {
        this.calls.push(data);

        if (this.result instanceof Error) {
            throw this.result;
        }

        return {
            data,
            client: { id: data.client_id, name: 'app' } as Client,
            scopes: [],
            redirectUriVerified: true,
            ...this.result,
        } as OAuth2AuthorizationCodeRequestVerificationResult;
    }
}
