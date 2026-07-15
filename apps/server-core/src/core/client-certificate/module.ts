/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { X509Certificate as NodeX509Certificate } from 'node:crypto';
import {
    BasicConstraintsExtension,
    ExtendedKeyUsage,
    ExtendedKeyUsageExtension,
    URL as GENERAL_NAME_URL,
    KeyUsageFlags,
    KeyUsagesExtension,
    SubjectAlternativeNameExtension,
    X509Certificate,
} from '@peculiar/x509';
import type { Client, TrustAnchor } from '@authup/core-kit';
import {
    CLIENT_CERTIFICATE_URI_PREFIX,
    buildClientCertificateURI,
} from '@authup/core-kit';
import { BadRequestError } from '@authup/errors';
import { parseCertificateChain } from '../key/index.ts';
import type {
    ClientCertificateEvidence,
    ClientCertificateValidatorContext,
} from './types.ts';

const MAX_CHAIN_DEPTH = 10;

/**
 * Validates client certificates without performing network I/O. AIA, CRL,
 * and OCSP retrieval are deliberately outside the external-PKI first slice.
 */
export class ClientCertificateValidator {
    protected trustAnchorRepository: ClientCertificateValidatorContext['trustAnchorRepository'];

    constructor(ctx: ClientCertificateValidatorContext) {
        this.trustAnchorRepository = ctx.trustAnchorRepository;
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

            const path = buildPath(
                evidence.certificate,
                evidence.chain,
                anchorCertificate,
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

    if (evidence.certificate.ca) {
        throw new BadRequestError('A CA certificate cannot be used as a client certificate.');
    }
}

function parseAnchorCertificate(anchor: TrustAnchor): NodeX509Certificate | undefined {
    try {
        return parseCertificateChain(anchor.certificate)[0];
    } catch {
        // Rows are validated on create. Treat a corrupt legacy/database row as
        // unusable trust material instead of turning client authentication into
        // a 500 or accidentally trusting another certificate in its PEM chain.
        return undefined;
    }
}

function buildPath(
    leaf: NodeX509Certificate,
    intermediates: NodeX509Certificate[],
    anchor: NodeX509Certificate,
): NodeX509Certificate[] | undefined {
    return continuePath(leaf, intermediates, anchor, [leaf]);
}

function continuePath(
    current: NodeX509Certificate,
    available: NodeX509Certificate[],
    anchor: NodeX509Certificate,
    path: NodeX509Certificate[],
): NodeX509Certificate[] | undefined {
    if (path.length > MAX_CHAIN_DEPTH) {
        return undefined;
    }

    if (sameCertificate(current, anchor)) {
        return path;
    }

    if (isIssuedBy(current, anchor)) {
        return [...path, anchor];
    }

    for (let index = 0; index < available.length; index += 1) {
        const candidate = available[index];
        if (!candidate || sameCertificate(current, candidate) || !isIssuedBy(current, candidate)) {
            continue;
        }

        const next = continuePath(
            candidate,
            available.filter((_item, candidateIndex) => candidateIndex !== index),
            anchor,
            [...path, candidate],
        );
        if (next) {
            return next;
        }
    }

    return undefined;
}

function isIssuedBy(certificate: NodeX509Certificate, issuer: NodeX509Certificate): boolean {
    try {
        return certificate.checkIssued(issuer) && certificate.verify(issuer.publicKey);
    } catch {
        return false;
    }
}

function sameCertificate(left: NodeX509Certificate, right: NodeX509Certificate): boolean {
    return left.raw.equals(right.raw);
}

function assertCertificationPath(path: NodeX509Certificate[]): void {
    if (path.length < 2) {
        throw new BadRequestError('The client certificate chain is invalid.');
    }

    for (let index = 1; index < path.length; index += 1) {
        const certificate = path[index];
        if (!certificate) {
            throw new BadRequestError('The client certificate chain is invalid.');
        }

        assertCertificateCurrent(certificate);
        const parsed = new X509Certificate(certificate.raw);
        const constraints = parsed.getExtension(BasicConstraintsExtension);
        if (!certificate.ca || !constraints?.ca) {
            throw new BadRequestError('The client certificate chain contains a non-CA issuer.');
        }

        const keyUsage = parsed.getExtension(KeyUsagesExtension);
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

function assertClientCertificatePurpose(certificate: NodeX509Certificate): void {
    const parsed = new X509Certificate(certificate.raw);

    const extendedKeyUsage = parsed.getExtension(ExtendedKeyUsageExtension);
    if (
        extendedKeyUsage &&
        !extendedKeyUsage.usages.includes(ExtendedKeyUsage.clientAuth)
    ) {
        throw new BadRequestError('The certificate is not valid for TLS client authentication.');
    }

    const keyUsage = parsed.getExtension(KeyUsagesExtension);
    if (keyUsage && (keyUsage.usages & KeyUsageFlags.digitalSignature) === 0) {
        throw new BadRequestError('The certificate cannot prove possession of its private key.');
    }
}

function assertClientCertificateIdentity(certificate: NodeX509Certificate, clientId: string): void {
    const parsed = new X509Certificate(certificate.raw);
    const subjectAlternativeName = parsed.getExtension(SubjectAlternativeNameExtension);
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

function assertCertificateCurrent(certificate: NodeX509Certificate): void {
    const now = Date.now();
    if (
        certificate.validFromDate.getTime() > now ||
        certificate.validToDate.getTime() < now
    ) {
        throw new BadRequestError('The client certificate is not currently valid.');
    }
}
