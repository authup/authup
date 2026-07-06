/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { JWTError } from '@authup/specs';
import type {
    IOAuth2TokenVerifier,
    OAuth2TokenVerifyOptions,
} from '../../../../src/core/index.ts';

export class FakeOAuth2TokenVerifier implements IOAuth2TokenVerifier {
    public verifyCalls: { token: string, options?: OAuth2TokenVerifyOptions }[] = [];

    public isInactiveCalls: string[] = [];

    private payloadsByToken = new Map<string, OAuth2TokenPayload>();

    private inactive = new Set<string>();

    seed(token: string, payload: OAuth2TokenPayload) {
        this.payloadsByToken.set(token, payload);
    }

    setInactive(jti: string) {
        this.inactive.add(jti);
    }

    async verify(token: string, options?: OAuth2TokenVerifyOptions): Promise<OAuth2TokenPayload> {
        this.verifyCalls.push({ token, options });

        const payload = this.payloadsByToken.get(token);
        if (!payload) {
            throw JWTError.notActive();
        }

        if (!options?.skipActiveCheck && payload.jti && this.inactive.has(payload.jti)) {
            throw JWTError.notActive();
        }

        return payload;
    }

    async isInactive(token: string): Promise<boolean> {
        this.isInactiveCalls.push(token);
        return this.inactive.has(token);
    }
}
