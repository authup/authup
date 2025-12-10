/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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

function base64URLEncode(arrayBuffer: ArrayBuffer) {
    // Convert the ArrayBuffer to string using Uint8 array.
    // btoa takes chars from 0-255 and base64 encodes.
    // Then convert the base64 encoded to base64url encoded.
    // (replace + with -, replace / with _, trim trailing =)
    const charCode = Array.from(new Uint8Array(arrayBuffer));

    return btoa(String.fromCharCode.apply(charCode))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function buildOAuth2CodeChallenge(codeVerifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const arrayBuffer = await subtle.digest('SHA-256', data);

    return base64URLEncode(arrayBuffer);
}
