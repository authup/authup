/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import type { IOAuth2TokenSigner } from '../../../../src/core/oauth2/token/signer/types.ts';

export class FakeOAuth2TokenSigner implements IOAuth2TokenSigner {
    public signCalls: OAuth2TokenPayload[] = [];

    constructor(private signature = 'signed-token') {}

    async sign<T extends OAuth2TokenPayload>(payload: T): Promise<string> {
        this.signCalls.push(payload);
        return this.signature;
    }
}
