/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2TokenPayload } from '@authup/specs';
import type { Identity } from '@authup/core-kit';
import type {
    IOAuth2OpenIDTokenIssuer,
} from '../../../../src/core/oauth2/token/issuer/open-id/types.ts';
import type { OAuth2TokenIssuerResponse } from '../../../../src/core/oauth2/token/issuer/types.ts';

export class FakeOAuth2OpenIDTokenIssuer implements IOAuth2OpenIDTokenIssuer {
    public issueCalls: OAuth2TokenPayload[] = [];

    public issueWithIdentityCalls: OAuth2TokenPayload[] = [];

    constructor(private exp: number = Math.floor(Date.now() / 1000) + 3600) {}

    async issue(input: OAuth2TokenPayload = {}): Promise<OAuth2TokenIssuerResponse> {
        this.issueCalls.push(input);
        const jti = randomUUID();
        return [`id-token-${jti}`, {
            ...input, 
            jti, 
            exp: this.exp, 
        } as OAuth2TokenPayload];
    }

    async issueWithIdentity(
        input: OAuth2TokenPayload,
        _identity: Identity,
    ): Promise<OAuth2TokenIssuerResponse> {
        this.issueWithIdentityCalls.push(input);
        return this.issue(input);
    }

    buildExp(): number {
        return this.exp;
    }
}
