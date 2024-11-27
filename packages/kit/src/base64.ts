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

    return bytes;
}
