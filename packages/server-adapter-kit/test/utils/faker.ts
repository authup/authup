/*
 * Copyright (c) 2023.
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

export class Faker {
    protected keyPair: CryptoKeyPair | undefined;

    protected jwk : OAuth2JsonWebKey | undefined;

    async useKeyPair() {
        if (typeof this.keyPair !== 'undefined') {
            return this.keyPair;
        }

        this.keyPair = await createAsymmetricKeyPair({
            name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
        });

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

    async sign(payload: Record<string, any>) {
        const keyPair = await this.useKeyPair();
        return signToken(payload, {
            type: 'rsa',
            key: keyPair.privateKey,
            keyId: 'foo',
        });
    }
}
