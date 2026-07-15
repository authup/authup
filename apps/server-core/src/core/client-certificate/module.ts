/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AuthorityKeyIdentifierExtension,
    BasicConstraintsExtension,
    ExtendedKeyUsage,
    ExtendedKeyUsageExtension,
    URL as GENERAL_NAME_URL,
    KeyUsageFlags,
    KeyUsagesExtension,
    SubjectAlternativeNameExtension,
    SubjectKeyIdentifierExtension,
    X509Certificate,
} from '@peculiar/x509';
import type { Client, TrustAnchor } from '@authup/core-kit';
import {
    CLIENT_CERTIFICATE_URI_PREFIX,
    buildClientCertificateURI,
} from '@authup/core-kit';
import { BadRequestError } from '@authup/errors';
import { base64URLEncode } from '@authup/kit';
import type {
    ClientCertificateEvidence,
    ClientCertificateValidatorContext,
} from './types.ts';

const MAX_CHAIN_DEPTH = 10;
const CERTIFICATE_BLOCK_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;

/**
 * Validates client certificates without performing network I/O. AIA, CRL,
 * and OCSP retrieval are deliberately outside the external-PKI first slice.
 */
export class ClientCertificateValidator {
    protected trustAnchorRepository: ClientCertificateValidatorContext['trustAnchorRepository'];

    protected crypto?: Crypto;

    constructor(ctx: ClientCertificateValidatorContext) {
        this.trustAnchorRepository = ctx.trustAnchorRepository;
        this.crypto = ctx.crypto;
    }

    validateForBinding(evidence: ClientCertificateEvidence): void {
        assertClientCertificateEvidenceValidForBinding(evidence);
    }

    async validateForAuthentication(
        client: Pick<Client, 'id' | 'realm_id'>,
        evidence: ClientCertificateEvidence,
    ): Promise<void> {
        this.validateForBinding(evidence);
        assertClientCertificatePurpose(evidence.certificate);
        assertClientCertificateIdentity(evidence.certificate, client.id);

        const anchors = await this.trustAnchorRepository.findManyBy({
            realm_id: client.realm_id,
            enabled: true,
        });

        for (const anchor of anchors) {
            const anchorCertificate = parseAnchorCertificate(anchor);
            if (!anchorCertificate) {
                continue;
            }

            const path = await buildPath(
                evidence.certificate,
                evidence.chain,
                anchorCertificate,
                this.crypto,
            );
            if (!path) {
                continue;
            }

            assertCertificationPath(path);
            return;
        }

        throw new BadRequestError('The client certificate is not trusted in this realm.');
    }
}

export function assertClientCertificateEvidenceValidForBinding(
    evidence: ClientCertificateEvidence,
): void {
    assertCertificateCurrent(evidence.certificate);

    const constraints = evidence.certificate.getExtension(BasicConstraintsExtension);
    if (constraints?.ca) {
        throw new BadRequestError('A CA certificate cannot be used as a client certificate.');
    }
}

export function parseClientCertificateChain(pem: string): X509Certificate[] {
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

export async function buildClientCertificateThumbprint(
    certificate: X509Certificate,
    crypto?: Crypto,
): Promise<string> {
    const digest = await certificate.getThumbprint('SHA-256', crypto);

    return base64URLEncode(
        String.fromCharCode(...new Uint8Array(digest)),
    );
}

function parseAnchorCertificate(anchor: TrustAnchor): X509Certificate | undefined {
    try {
        return parseClientCertificateChain(anchor.certificate)[0];
    } catch {
        // Rows are validated on create. Treat a corrupt legacy/database row as
        // unusable trust material instead of turning client authentication into
        // a 500 or accidentally trusting another certificate in its PEM chain.
        return undefined;
    }
}

async function buildPath(
    leaf: X509Certificate,
    intermediates: X509Certificate[],
    anchor: X509Certificate,
    crypto?: Crypto,
): Promise<X509Certificate[] | undefined> {
    return continuePath(leaf, intermediates, anchor, [leaf], crypto);
}

async function continuePath(
    current: X509Certificate,
    available: X509Certificate[],
    anchor: X509Certificate,
    path: X509Certificate[],
    crypto?: Crypto,
): Promise<X509Certificate[] | undefined> {
    if (path.length > MAX_CHAIN_DEPTH) {
        return undefined;
    }

    if (sameCertificate(current, anchor)) {
        return path;
    }

    if (await isIssuedBy(current, anchor, crypto)) {
        return [...path, anchor];
    }

    for (let index = 0; index < available.length; index += 1) {
        const candidate = available[index];
        if (
            !candidate ||
            sameCertificate(current, candidate) ||
            !await isIssuedBy(current, candidate, crypto)
        ) {
            continue;
        }

        const next = await continuePath(
            candidate,
            available.filter((_item, candidateIndex) => candidateIndex !== index),
            anchor,
            [...path, candidate],
            crypto,
        );
        if (next) {
            return next;
        }
    }

    return undefined;
}

async function isIssuedBy(
    certificate: X509Certificate,
    issuer: X509Certificate,
    crypto?: Crypto,
): Promise<boolean> {
    if (certificate.issuer !== issuer.subject) {
        return false;
    }

    const authorityKeyIdentifier = certificate.getExtension(AuthorityKeyIdentifierExtension);
    if (authorityKeyIdentifier?.keyId) {
        const subjectKeyIdentifier = issuer.getExtension(SubjectKeyIdentifierExtension);
        if (subjectKeyIdentifier && subjectKeyIdentifier.keyId !== authorityKeyIdentifier.keyId) {
            return false;
        }
    }

    try {
        return await certificate.verify({
            publicKey: issuer,
            signatureOnly: true,
        }, crypto);
    } catch {
        return false;
    }
}

function sameCertificate(left: X509Certificate, right: X509Certificate): boolean {
    const leftRaw = new Uint8Array(left.rawData);
    const rightRaw = new Uint8Array(right.rawData);

    return leftRaw.length === rightRaw.length &&
        leftRaw.every((value, index) => value === rightRaw[index]);
}

function assertCertificationPath(path: X509Certificate[]): void {
    if (path.length < 2) {
        throw new BadRequestError('The client certificate chain is invalid.');
    }

    for (let index = 1; index < path.length; index += 1) {
        const certificate = path[index];
        if (!certificate) {
            throw new BadRequestError('The client certificate chain is invalid.');
        }

        assertCertificateCurrent(certificate);
        const constraints = certificate.getExtension(BasicConstraintsExtension);
        if (!constraints?.ca) {
            throw new BadRequestError('The client certificate chain contains a non-CA issuer.');
        }

        const keyUsage = certificate.getExtension(KeyUsagesExtension);
        if (keyUsage && (keyUsage.usages & KeyUsageFlags.keyCertSign) === 0) {
            throw new BadRequestError('A client certificate issuer cannot sign certificates.');
        }

        // `index - 1` is the number of non-leaf CA certificates below this
        // issuer in the selected path. A pathLenConstraint of zero therefore
        // permits a directly-issued client leaf and no subordinate CA.
        if (
            typeof constraints.pathLength === 'number' &&
            (index - 1) > constraints.pathLength
        ) {
            throw new BadRequestError('The client certificate chain exceeds a CA path-length constraint.');
        }
    }
}

function assertClientCertificatePurpose(certificate: X509Certificate): void {
    const extendedKeyUsage = certificate.getExtension(ExtendedKeyUsageExtension);
    if (
        extendedKeyUsage &&
        !extendedKeyUsage.usages.includes(ExtendedKeyUsage.clientAuth)
    ) {
        throw new BadRequestError('The certificate is not valid for TLS client authentication.');
    }

    const keyUsage = certificate.getExtension(KeyUsagesExtension);
    if (keyUsage && (keyUsage.usages & KeyUsageFlags.digitalSignature) === 0) {
        throw new BadRequestError('The certificate cannot prove possession of its private key.');
    }
}

function assertClientCertificateIdentity(certificate: X509Certificate, clientId: string): void {
    const subjectAlternativeName = certificate.getExtension(SubjectAlternativeNameExtension);
    const authupUris = subjectAlternativeName ?
        subjectAlternativeName.names.items
            .filter((name) => name.type === GENERAL_NAME_URL)
            .map((name) => name.value)
            .filter((value) => value.startsWith(CLIENT_CERTIFICATE_URI_PREFIX)) :
        [];

    const expected = buildClientCertificateURI(clientId);
    if (authupUris.length !== 1 || authupUris[0] !== expected) {
        throw new BadRequestError(`The certificate must contain exactly one Authup client URI SAN: ${expected}.`);
    }
}

function assertCertificateCurrent(certificate: X509Certificate): void {
    const now = Date.now();
    if (
        certificate.notBefore.getTime() > now ||
        certificate.notAfter.getTime() < now
    ) {
        throw new BadRequestError('The client certificate is not currently valid.');
    }
}
