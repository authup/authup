/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2JsonWebKey } from '@authup/specs';
import {
    AsymmetricKey,
    CryptoAsymmetricAlgorithm,
    createAsymmetricKeyPair,
    signToken,
} from '@authup/server-kit';

export const SIGNER_KEY_ID = '3e9a7c1d-5b2f-4d8a-9e6c-4f1b2a3d5c7e';

export class Signer {
    protected keyPair: CryptoKeyPair | undefined;

    protected jwk : OAuth2JsonWebKey | undefined;

    async useKeyPair() {
        if (typeof this.keyPair !== 'undefined') {
            return this.keyPair;
        }

        this.keyPair = await createAsymmetricKeyPair({ name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5 });

        return this.keyPair;
    }

    async useJwk() : Promise<OAuth2JsonWebKey> {
        if (typeof this.jwk !== 'undefined') {
            return this.jwk;
        }

        const keyPair = await this.useKeyPair();
        const key = new AsymmetricKey(keyPair.publicKey);

        this.jwk = (await key.toJWK()) as OAuth2JsonWebKey;

        return this.jwk;
    }

    async sign(payload: Record<string, any>, keyId: string = SIGNER_KEY_ID) {
        const keyPair = await this.useKeyPair();
        return signToken(payload, {
            type: 'rsa',
            key: keyPair.privateKey,
            keyId,
        });
    }
}
