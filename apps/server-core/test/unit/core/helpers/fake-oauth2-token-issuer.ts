/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { OAuth2TokenPayload } from '@authup/specs';
import type {
    IOAuth2TokenIssuer,
    OAuth2TokenIssuerResponse,
} from '../../../../src/core/oauth2/token/issuer/types.ts';

export class FakeOAuth2TokenIssuer implements IOAuth2TokenIssuer {
    public issueCalls: OAuth2TokenPayload[] = [];

    public buildExpCalls: (OAuth2TokenPayload | undefined)[] = [];

    constructor(private exp: number = Math.floor(Date.now() / 1000) + 3600) {}

    async issue(input: OAuth2TokenPayload): Promise<OAuth2TokenIssuerResponse> {
        this.issueCalls.push(input);
        const jti = randomUUID();
        const payload: OAuth2TokenPayload = {
            ...input,
            jti,
            exp: this.exp,
        } as OAuth2TokenPayload;
        return [`signed-token-${jti}`, payload];
    }

    buildExp(input?: OAuth2TokenPayload): number {
        this.buildExpCalls.push(input);
        return this.exp;
    }
}
