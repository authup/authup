/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { X509Certificate, createHash } from 'node:crypto';
import { BadRequestError } from '@authup/errors';

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
    const certificateKey = chain[0].publicKey.export({
        type: 'spki',
        format: 'der',
    });
    const importedKey = Buffer.from(spkiBase64, 'base64');

    if (Buffer.compare(certificateKey, importedKey) !== 0) {
        throw new BadRequestError('The certificate does not match the key material.');
    }
}

export function buildX5c(chain: X509Certificate[]): string[] {
    return chain.map((certificate) => certificate.raw.toString('base64'));
}

export function buildX5tS256(chain: X509Certificate[]): string {
    return createHash('sha256')
        .update(chain[0].raw)
        .digest('base64url');
}
