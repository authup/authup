/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTAlgorithm } from '@authup/specs';
import { JWTError } from '@authup/specs';
import { subtle } from 'uncrypto';

export function generateOAuth2CodeVerifier() {
    const length = 64;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

    let codeVerifier = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
        codeVerifier += charset[randomValues[i] % charset.length];
    }

    return codeVerifier;
}

export function base64URLEncode(arrayBuffer: ArrayBuffer) {
    // Convert the ArrayBuffer to string using Uint8 array.
    // btoa takes chars from 0-255 and base64 encodes.
    // Then convert the base64 encoded to base64url encoded.
    // (replace + with -, replace / with _, trim trailing =)
    const charCode = Array.from(new Uint8Array(arrayBuffer));

    return btoa(String.fromCharCode.apply(null, charCode))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// OIDC Core §3.1.3.6: at_hash / c_hash use the hash algorithm of the id_token's
// JWS alg (…S256 → SHA-256, …S384 → SHA-384, …S512 → SHA-512) and keep the LEFT
// HALF of the digest — so the half-length follows the digest (16/24/32 bytes).
const TOKEN_HASH_DIGESTS : Record<string, { name: string, halfLength: number }> = {
    256: { name: 'SHA-256', halfLength: 16 },
    384: { name: 'SHA-384', halfLength: 24 },
    512: { name: 'SHA-512', halfLength: 32 },
};

export async function buildOAuth2TokenHash(
    value: string,
    alg?: `${JWTAlgorithm}` | null,
) : Promise<string> {
    // A key row without a persisted alg (nullable legacy column) signs with
    // the signer's *256 default (RS256/ES256/HS256) — derive the matching
    // SHA-256 digest. An unrecognized alg still fails loud — silently
    // defaulting there would mint a hash no conforming verifier accepts.
    const digest = alg ?
        TOKEN_HASH_DIGESTS[alg.slice(-3)] :
        TOKEN_HASH_DIGESTS['256'];
    if (!digest) {
        throw JWTError.headerPropertyInvalid('alg');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await subtle.digest(digest.name, data);
    const halfHash = hashBuffer.slice(0, digest.halfLength);

    return base64URLEncode(halfHash);
}

export async function buildOAuth2CodeChallenge(codeVerifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const arrayBuffer = await subtle.digest('SHA-256', data);

    return base64URLEncode(arrayBuffer);
}
