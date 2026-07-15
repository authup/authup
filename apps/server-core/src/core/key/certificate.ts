/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    X509Certificate,
    createPublicKey,
} from 'node:crypto';
import { BadRequestError } from '@authup/errors';
import { base64URLEncode } from '@authup/kit';
import { subtle } from 'uncrypto';
import { KeyCertificateError } from './certificate-error.ts';

const CERTIFICATE_BLOCK_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;

export function parseCertificateChain(pem: string): X509Certificate[] {
    const blocks = pem.match(CERTIFICATE_BLOCK_PATTERN);
    if (!blocks || blocks.length === 0) {
        throw new BadRequestError('The certificate chain could not be parsed.');
    }

    try {
        return blocks.map((block) => new X509Certificate(block));
    } catch {
        throw new BadRequestError('The certificate chain could not be parsed.');
    }
}

export function assertCertificateMatchesKey(
    chain: X509Certificate[],
    spkiBase64: string,
): void {
    const certificate = chain[0];
    if (!certificate) {
        throw new KeyCertificateError('The certificate chain is empty.');
    }

    const certificateKey = certificate.publicKey.export({
        type: 'spki',
        format: 'der',
    });

    let importedKey : Buffer;
    try {
        importedKey = createPublicKey({
            key: Buffer.from(spkiBase64, 'base64'),
            type: 'spki',
            format: 'der',
        }).export({
            type: 'spki',
            format: 'der',
        });
    } catch {
        throw new KeyCertificateError('The imported public key material is invalid.');
    }

    if (Buffer.compare(certificateKey, importedKey) !== 0) {
        throw new KeyCertificateError('The certificate does not match the key material.');
    }
}

export function buildX5c(chain: X509Certificate[]): string[] {
    return chain.map((certificate) => certificate.raw.toString('base64'));
}

export async function buildX5tS256(chain: X509Certificate[]): Promise<string> {
    const certificate = chain[0];
    if (!certificate) {
        throw new KeyCertificateError('The certificate chain is empty.');
    }

    const digest = await subtle.digest('SHA-256', certificate.raw);

    return base64URLEncode(
        String.fromCharCode(...new Uint8Array(digest)),
    );
}
