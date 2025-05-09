/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function base64ToArrayBuffer(base64: string) : ArrayBuffer {
    const bin = atob(base64);
    const len = bin.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = bin.charCodeAt(i);
    }

    return bytes.buffer;
}

/**
 * @see https://thewoods.blog/base64url/
 *
 * @param input
 */
export function base64URLEncode(input: string): string {
    return btoa(input)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * @see https://thewoods.blog/base64url/
 *
 * @param value
 */
export function base64URLDecode(value: string): string {
    const m = value.length % 4;

    return atob(
        value.replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(value.length + (m === 0 ? 0 : 4 - m), '='),
    );
}
