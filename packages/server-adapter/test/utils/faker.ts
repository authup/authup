/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createPublicKey } from 'node:crypto';
import type { OAuth2JsonWebKey } from '@authup/core';
import type { KeyPair } from '@authup/server-core';
import { createKeyPair, signToken, useKeyPair } from '@authup/server-core';

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
            algorithm: 'RS256',
        });
    }
}
