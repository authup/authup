/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { arrayBufferToBase64 } from '@authup/kit';
import { subtle } from 'uncrypto';

export abstract class BaseKey {
    protected key : CryptoKey;

    // ----------------------------------------------

    constructor(cryptoKey : CryptoKey) {
        this.key = cryptoKey;
    }

    // ----------------------------------------------

    async toArrayBuffer(): Promise<ArrayBuffer> {
        if (this.key.type === 'private') {
            return subtle.exportKey('pkcs8', this.key);
        }

        if (this.key.type === 'public') {
            return subtle.exportKey('spki', this.key);
        }

        return subtle.exportKey('raw', this.key);
    }

    async toUint8Array(): Promise<Uint8Array> {
        const arrayBuffer = await this.toArrayBuffer();
        return new Uint8Array(arrayBuffer);
    }

    async toBase64() : Promise<string> {
        const arrayBuffer = await this.toArrayBuffer();
        return arrayBufferToBase64(arrayBuffer);
    }

    async toJWK() : Promise<JsonWebKey> {
        return subtle.exportKey('jwk', this.key);
    }
}
