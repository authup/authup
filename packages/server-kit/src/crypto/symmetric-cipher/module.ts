/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { arrayBufferToBase64, base64ToArrayBuffer } from '@authup/kit';
import { getRandomValues, subtle } from 'uncrypto';
import { SymmetricAlgorithm } from '../key/symmetric/constants';
import { getKeyUsagesForSymmetricAlgorithm } from '../key/symmetric/key-usages';
import type { ISymmetricCipher } from './types';

const IV_BYTE_LENGTH = 12;
const KEY_BYTE_LENGTH = 32;

/**
 * AES-256-GCM cipher over a base64-encoded 32-byte key. Blob format:
 * base64(iv ‖ ciphertext ‖ tag) — WebCrypto appends the GCM tag to the
 * ciphertext, so the layout is iv (12 bytes) followed by the sealed rest.
 */
export class SymmetricCipher implements ISymmetricCipher {
    protected key : Promise<CryptoKey>;

    constructor(key: string) {
        this.key = SymmetricCipher.importKey(key);
    }

    protected static async importKey(key: string) : Promise<CryptoKey> {
        const raw = base64ToArrayBuffer(key.trim());
        if (raw.byteLength !== KEY_BYTE_LENGTH) {
            throw new Error(`The cipher key must decode to ${KEY_BYTE_LENGTH} bytes (got ${raw.byteLength}).`);
        }

        return subtle.importKey(
            'raw',
            raw,
            { name: SymmetricAlgorithm.AES_GCM },
            false,
            getKeyUsagesForSymmetricAlgorithm(SymmetricAlgorithm.AES_GCM),
        );
    }

    async encrypt(plain: string): Promise<string> {
        const key = await this.key;

        const iv = getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
        const sealed = await subtle.encrypt(
            { name: SymmetricAlgorithm.AES_GCM, iv },
            key,
            new TextEncoder().encode(plain),
        );

        const blob = new Uint8Array(iv.byteLength + sealed.byteLength);
        blob.set(iv, 0);
        blob.set(new Uint8Array(sealed), iv.byteLength);

        return arrayBufferToBase64(blob.buffer);
    }

    async decrypt(blob: string): Promise<string> {
        const key = await this.key;

        const raw = new Uint8Array(base64ToArrayBuffer(blob));
        if (raw.byteLength <= IV_BYTE_LENGTH) {
            throw new Error('The cipher blob is malformed.');
        }

        const plain = await subtle.decrypt(
            { name: SymmetricAlgorithm.AES_GCM, iv: raw.subarray(0, IV_BYTE_LENGTH) },
            key,
            raw.subarray(IV_BYTE_LENGTH),
        );

        return new TextDecoder().decode(plain);
    }
}
