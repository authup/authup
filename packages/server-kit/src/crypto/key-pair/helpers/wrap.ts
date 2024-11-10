/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

function wrapPem(
    type: 'PRIVATE KEY' | 'PUBLIC KEY',
    input: string | ArrayBuffer | Buffer,
) {
    if (typeof input !== 'string') {
        input = Buffer.from(input).toString('base64');
    }

    return `-----BEGIN ${type}-----\n${input}\n-----END ${type}-----`;
}

export function wrapPrivateKeyPem(input: string | ArrayBuffer | Buffer) {
    return wrapPem('PRIVATE KEY', input);
}

export function wrapPublicKeyPem(input: string | ArrayBuffer | Buffer) {
    return wrapPem('PUBLIC KEY', input);
}

// ------------------------------------------------------------

function unwrapPem(
    type: 'PRIVATE KEY' | 'PUBLIC KEY',
    input: string,
) {
    if (typeof input !== 'string') {
        input = Buffer.from(input).toString('base64');
    }

    input = input.replace(`-----BEGIN ${type}-----\n`, '');

    input = input.replace(`\n-----END ${type}-----\n`, '');
    input = input.replace(`-----END ${type}-----\n`, '');
    input = input.replace(`\n-----END ${type}-----`, '');

    return input;
}

export function unwrapPrivateKeyPem(input: string) {
    return unwrapPem('PRIVATE KEY', input);
}

export function unwrapPublicKeyPem(input: string) {
    return unwrapPem('PUBLIC KEY', input);
}
