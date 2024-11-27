/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

function enc(
    type: 'PRIVATE KEY' | 'PUBLIC KEY',
    input: string,
) {
    return `-----BEGIN ${type}-----\n${input}\n-----END ${type}-----`;
}

export function encodePKCS8ToPEM(base64: string) {
    return enc('PRIVATE KEY', base64);
}

export function encodeSPKIToPem(input: string) {
    return enc('PUBLIC KEY', input);
}

// ------------------------------------------------------------

function dec(
    type: 'PRIVATE KEY' | 'PUBLIC KEY',
    input: string,
) {
    input = input.replace(`-----BEGIN ${type}-----\n`, '');

    input = input.replace(`\n-----END ${type}-----\n`, '');
    input = input.replace(`-----END ${type}-----\n`, '');
    input = input.replace(`\n-----END ${type}-----`, '');

    return input;
}

export function decodePemToPKCS8(input: string) {
    return dec('PRIVATE KEY', input);
}

export function decodePemToSpki(input: string) {
    return dec('PUBLIC KEY', input);
}
