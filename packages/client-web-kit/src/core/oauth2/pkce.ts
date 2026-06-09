/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type PKCE = {
    code_verifier: string,
    code_challenge: string,
    code_challenge_method: 'S256'
};

function base64UrlEncode(bytes: Uint8Array): string {
    let str = '';
    for (const byte of bytes) {
        str += String.fromCharCode(byte);
    }

    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function randomString(length = 64): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    return base64UrlEncode(bytes);
}

export function createState(): string {
    return randomString(32);
}

export async function createPKCE(): Promise<PKCE> {
    const codeVerifier = randomString(64);

    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(codeVerifier),
    );

    return {
        code_verifier: codeVerifier,
        code_challenge: base64UrlEncode(new Uint8Array(digest)),
        code_challenge_method: 'S256',
    };
}
