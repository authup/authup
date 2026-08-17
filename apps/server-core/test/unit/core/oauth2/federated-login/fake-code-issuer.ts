/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { IOAuth2AuthorizationCodeIssuer } from '../../../../../src/core/oauth2/authorization/index.ts';

export class FakeCodeIssuer implements IOAuth2AuthorizationCodeIssuer {
    public issued : OAuth2AuthorizationCodeRequest[] = [];

    async issue(input: OAuth2AuthorizationCodeRequest) {
        this.issued.push(input);

        return { id: 'authorization-code-1' } as OAuth2AuthorizationCode;
    }
}
