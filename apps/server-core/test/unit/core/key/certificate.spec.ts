/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFileSync } from 'node:fs';
import { ErrorCode } from '@authup/errors';
import {
    describe,
    expect,
    it,
} from 'vitest';
import {
    assertCertificateMatchesKey,
    buildX5c,
    buildX5tS256,
    parseCertificateChain,
} from '../../../../src/core/key/index.ts';

const CERTIFICATE = readFileSync(
    new URL('../../../data/certificates/certificate.pem', import.meta.url),
    'utf8',
);
const SECONDARY_CERTIFICATE = readFileSync(
    new URL('../../../data/certificates/secondary-certificate.pem', import.meta.url),
    'utf8',
);
const PUBLIC_KEY = readFileSync(
    new URL('../../../data/certificates/public-key.pem', import.meta.url),
    'utf8',
);

function pemToBase64(value: string): string {
    return value
        .replace(/-----(BEGIN|END)[^-]+-----/g, '')
        .replace(/\s+/g, '');
}

function omitRsaEncryptionNullParameter(spkiBase64: string): string {
    const canonical = Buffer.from(spkiBase64, 'base64');
    const alternate = Buffer.from(canonical);

    // Fixture SPKI prefix:
    // SEQUENCE (long-form length), AlgorithmIdentifier SEQUENCE,
    // rsaEncryption OID, NULL. RFC-tolerant parsers also accept the same
    // AlgorithmIdentifier without NULL, so adjust both enclosing lengths
    // before removing it.
    alternate[3] -= 2;
    alternate[5] -= 2;

    return Buffer.concat([
        alternate.subarray(0, 17),
        alternate.subarray(19),
    ]).toString('base64');
}

// Generated once for this committed test fixture with:
// openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 \
//   -subj '/CN=Authup Stage B Test Certificate' -addext 'basicConstraints=critical,CA:TRUE'
// openssl pkey -in private-key.pem -pubout -out public-key.pem
describe('core/key/certificate', () => {
    it('parses a single certificate and a leaf-first chain', () => {
        expect(parseCertificateChain(CERTIFICATE)).toHaveLength(1);

        const chain = parseCertificateChain(`${CERTIFICATE}\n${SECONDARY_CERTIFICATE}`);
        expect(chain).toHaveLength(2);
        expect(chain[0].subject).toContain('Authup Stage B Test Certificate');
        expect(chain[1].subject).toContain('Authup Stage B Secondary Certificate');
    });

    it('rejects text without a parseable certificate block', () => {
        expect(() => parseCertificateChain('not a certificate'))
            .toThrow(expect.objectContaining({ code: ErrorCode.BAD_REQUEST }));
    });

    it('accepts a matching SPKI and rejects a mismatched one', () => {
        const chain = parseCertificateChain(CERTIFICATE);
        expect(() => assertCertificateMatchesKey(chain, pemToBase64(PUBLIC_KEY))).not.toThrow();

        const mismatched = parseCertificateChain(SECONDARY_CERTIFICATE)[0]
            .publicKey
            .export({ type: 'spki', format: 'der' })
            .toString('base64');
        expect(() => assertCertificateMatchesKey(chain, mismatched))
            .toThrow(expect.objectContaining({ code: ErrorCode.BAD_REQUEST }));
    });

    it('normalizes equivalent SPKI encodings before comparison', () => {
        const chain = parseCertificateChain(CERTIFICATE);
        const canonical = pemToBase64(PUBLIC_KEY);
        const equivalent = omitRsaEncryptionNullParameter(canonical);

        expect(equivalent).not.toEqual(canonical);
        expect(() => assertCertificateMatchesKey(chain, equivalent)).not.toThrow();
    });

    it('builds leaf-first x5c values with standard base64 DER', () => {
        const chain = parseCertificateChain(`${CERTIFICATE}\n${SECONDARY_CERTIFICATE}`);

        expect(buildX5c(chain)).toEqual([
            chain[0].raw.toString('base64'),
            chain[1].raw.toString('base64'),
        ]);
    });

    it('builds the precomputed base64url SHA-256 thumbprint of the leaf', () => {
        const chain = parseCertificateChain(CERTIFICATE);
        expect(buildX5tS256(chain)).toEqual('U5hnhJe3UHk2pj5m9ZMDfvC54yBQXwExs9P6Ha_xjbE');
    });
});
