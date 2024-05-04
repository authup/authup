/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2JsonWebKey } from '@authup/kit';
import { JWTAlgorithm } from '@authup/kit';
import type { KeyPair } from '@authup/server-kit';
import { createKeyPair, signToken, useKeyPair } from '@authup/server-kit';
import { createPublicKey } from 'node:crypto';

export class Faker {
    protected keyPair: KeyPair;

    protected jwk : OAuth2JsonWebKey;

    async useKeyPair() {
        if (typeof this.keyPair !== 'undefined') {
            return this.keyPair;
        }

        this.keyPair = await createKeyPair({
            type: 'rsa',
        });
        return this.keyPair;
    }

    async useJwk() : Promise<OAuth2JsonWebKey> {
        if (typeof this.jwk !== 'undefined') {
            return this.jwk;
        }

        const keyPair = await useKeyPair();
        const keyObject = createPublicKey({
            key: keyPair.publicKey,
            format: 'pem',
            type: 'pkcs1',
        });

        this.jwk = {
            alg: 'RS256',
            kid: 'foo',
            ...keyObject.export({
                format: 'jwk',
            }),
        } as OAuth2JsonWebKey;

        return this.jwk;
    }

    async sign(payload: Record<string, any>) {
        return signToken(payload, {
            type: 'rsa',
            keyPair: await useKeyPair(),
            algorithm: JWTAlgorithm.RS256,
        });
    }
}
