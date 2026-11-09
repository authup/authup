/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWKType } from '@authup/specs';
import type { IOAuth2TokenSigner, OAuth2TokenSignOptions } from '../../../../src/core/oauth2/token/signer/types.ts';

export class FakeOAuth2TokenSigner implements IOAuth2TokenSigner {
    public signCalls: OAuth2TokenPayload[] = [];

    constructor(
        private signature = 'signed-token',
        private key: Pick<Key, 'type'> = { type: JWKType.RSA },
    ) {}

    async sign<T extends OAuth2TokenPayload>(payload: T, options: OAuth2TokenSignOptions = {}): Promise<string> {
        options.assertKey?.(this.key);

        this.signCalls.push(payload);

        return this.signature;
    }
}
