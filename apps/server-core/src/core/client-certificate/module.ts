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
import { ValidationError } from '@authup/errors';
import { base64URLEncode } from '@authup/kit';
import type {
    ClientCertificateEvidence,
    ClientCertificateValidatorContext,
    IClientCertificateValidator,
} from './types.ts';

const MAX_CHAIN_DEPTH = 10;
const CERTIFICATE_BLOCK_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;

/**
 * Hard ceiling on signature verifications performed while building a single
 * certification path. A legitimate chain of the maximum accepted length only
 * needs O(depth²) verifications; the ceiling exists purely to defuse the
 * factorial backtracking blow-up an attacker can induce with certificates
 * that mutually "issue" one another (shared key, identical subject/issuer
 * DNs). Reaching the ceiling is treated as "no path found" (fail closed).
 */
const MAX_PATH_SIGNATURE_VERIFICATIONS = 64;

/**
 * OIDs of the certificate extensions this validator actually processes. A
 * certificate carrying a *critical* extension outside this set is rejected
 * (RFC 5280 §4.2): an unprocessed critical constraint must never be silently
 * ignored. Because RFC 5280 requires the NameConstraints extension to be
 * marked critical, this also fails a name-constrained CA closed rather than
 * trusting a chain whose name constraints we do not evaluate.
 */
const HANDLED_CRITICAL_EXTENSION_OIDS = new Set<string>([
    '2.5.29.19', // basicConstraints
    '2.5.29.15', // keyUsage
    '2.5.29.37', // extKeyUsage
    '2.5.29.17', // subjectAltName
    '2.5.29.35', // authorityKeyIdentifier
    '2.5.29.14', // subjectKeyIdentifier
]);

const WEAK_SIGNATURE_HASHES = new Set<string>(['SHA-1', 'MD5', 'MD2', 'MD4']);

// anyExtendedKeyUsage (RFC 5280 §4.2.1.12) — a CA carrying it is unconstrained.
const ANY_EXTENDED_KEY_USAGE_OID = '2.5.29.37.0';

type SignatureVerificationBudget = { remaining: number };

/**
 * Validates client certificates without performing network I/O. AIA, CRL,
 * and OCSP retrieval are deliberately outside the external-PKI first slice.
 */
export class ClientCertificateValidator implements IClientCertificateValidator {
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
        client: Pick<Client, 'id' | 'realmId'>,
        evidence: ClientCertificateEvidence,
    ): Promise<void> {
        this.validateForBinding(evidence);
        assertClientCertificatePurpose(evidence.certificate);
        assertClientCertificateIdentity(evidence.certificate, client.id);
        assertCertificateExtensionsUnderstood(evidence.certificate);
        assertStrongSignature(evidence.certificate);

        const anchors = await this.trustAnchorRepository.findManyBy({
            realmId: client.realmId,
            enabled: true,
        });

        for (const anchor of anchors) {
            const anchorCertificate = parseAnchorCertificate(anchor);
            if (!anchorCertificate) {
                continue;
            }

            const budget: SignatureVerificationBudget = { remaining: MAX_PATH_SIGNATURE_VERIFICATIONS };
            const path = await buildPath(
                evidence.certificate,
                evidence.chain,
                anchorCertificate,
                budget,
                this.crypto,
            );
            if (!path) {
                continue;
            }

            try {
                assertCertificationPath(path);
                return;
            } catch {
                // A chain reaching this anchor failed its CA constraints;
                // another enabled anchor may still yield a valid path.
                continue;
            }
        }

        throw new ValidationError('The client certificate is not trusted in this realm.');
    }
}

export function assertClientCertificateEvidenceValidForBinding(
    evidence: ClientCertificateEvidence,
): void {
    assertCertificateCurrent(evidence.certificate);

    const constraints = evidence.certificate.getExtension(BasicConstraintsExtension);
    if (constraints?.ca) {
        throw new ValidationError('A CA certificate cannot be used as a client certificate.');
    }
}

export function parseClientCertificateChain(pem: string): X509Certificate[] {
    const blocks = pem.match(CERTIFICATE_BLOCK_PATTERN);
    if (!blocks || blocks.length === 0) {
        throw new ValidationError('The certificate chain could not be parsed.');
    }

    try {
        return blocks.map((block) => new X509Certificate(block));
    } catch {
        throw new ValidationError('The certificate chain could not be parsed.');
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
    budget: SignatureVerificationBudget,
    crypto?: Crypto,
): Promise<X509Certificate[] | undefined> {
    return continuePath(leaf, intermediates, anchor, [leaf], budget, crypto);
}

async function continuePath(
    current: X509Certificate,
    available: X509Certificate[],
    anchor: X509Certificate,
    path: X509Certificate[],
    budget: SignatureVerificationBudget,
    crypto?: Crypto,
): Promise<X509Certificate[] | undefined> {
    if (path.length > MAX_CHAIN_DEPTH) {
        return undefined;
    }

    if (sameCertificate(current, anchor)) {
        return path;
    }

    if (await isIssuedBy(current, anchor, budget, crypto)) {
        return [...path, anchor];
    }

    for (let index = 0; index < available.length; index += 1) {
        const candidate = available[index];
        if (
            !candidate ||
            sameCertificate(current, candidate) ||
            !await isIssuedBy(current, candidate, budget, crypto)
        ) {
            continue;
        }

        const next = await continuePath(
            candidate,
            available.filter((_item, candidateIndex) => candidateIndex !== index),
            anchor,
            [...path, candidate],
            budget,
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
    budget: SignatureVerificationBudget,
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

    // Spend from the shared verification budget only for the expensive
    // cryptographic check (the DN / key-id pre-filters above are cheap). Once
    // exhausted, treat every further edge as unverified so a maliciously
    // crafted mutually-issuing certificate set cannot force factorial work.
    if (budget.remaining <= 0) {
        return false;
    }
    budget.remaining -= 1;

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
        throw new ValidationError('The client certificate chain is invalid.');
    }

    for (let index = 1; index < path.length; index += 1) {
        const certificate = path[index];
        if (!certificate) {
            throw new ValidationError('The client certificate chain is invalid.');
        }

        // The last path element is the configured trust anchor, trusted a
        // priori — its self-signature algorithm and any critical extensions
        // it carries are the operator's responsibility, so the RFC 5280
        // conformance checks below apply only to the issued intermediates.
        const isAnchor = index === path.length - 1;
        if (!isAnchor) {
            assertCertificateExtensionsUnderstood(certificate);
            assertStrongSignature(certificate);
            assertIssuerExtendedKeyUsage(certificate);
        }

        assertCertificateCurrent(certificate);
        const constraints = certificate.getExtension(BasicConstraintsExtension);
        if (!constraints?.ca) {
            throw new ValidationError('The client certificate chain contains a non-CA issuer.');
        }

        const keyUsage = certificate.getExtension(KeyUsagesExtension);
        if (keyUsage && (keyUsage.usages & KeyUsageFlags.keyCertSign) === 0) {
            throw new ValidationError('A client certificate issuer cannot sign certificates.');
        }

        // `index - 1` is the number of non-leaf CA certificates below this
        // issuer in the selected path. A pathLenConstraint of zero therefore
        // permits a directly-issued client leaf and no subordinate CA.
        if (
            typeof constraints.pathLength === 'number' &&
            (index - 1) > constraints.pathLength
        ) {
            throw new ValidationError('The client certificate chain exceeds a CA path-length constraint.');
        }
    }
}

function assertClientCertificatePurpose(certificate: X509Certificate): void {
    const extendedKeyUsage = certificate.getExtension(ExtendedKeyUsageExtension);
    if (
        extendedKeyUsage &&
        !extendedKeyUsage.usages.includes(ExtendedKeyUsage.clientAuth)
    ) {
        throw new ValidationError('The certificate is not valid for TLS client authentication.');
    }

    const keyUsage = certificate.getExtension(KeyUsagesExtension);
    if (keyUsage && (keyUsage.usages & KeyUsageFlags.digitalSignature) === 0) {
        throw new ValidationError('The certificate cannot prove possession of its private key.');
    }
}

/**
 * EKU chaining (RFC 5280 §4.2.1.12): a CA whose Extended Key Usage is present
 * but omits both `clientAuth` and `anyExtendedKeyUsage` is not permitted to
 * issue TLS-client-authentication certificates, so a leaf beneath it must be
 * rejected. (A CA's EKU may be non-critical, so the critical-extension check
 * does not cover this.) A CA with no EKU extension is unconstrained.
 */
function assertIssuerExtendedKeyUsage(certificate: X509Certificate): void {
    const extendedKeyUsage = certificate.getExtension(ExtendedKeyUsageExtension);
    if (
        extendedKeyUsage &&
        !extendedKeyUsage.usages.includes(ExtendedKeyUsage.clientAuth) &&
        !extendedKeyUsage.usages.includes(ANY_EXTENDED_KEY_USAGE_OID)
    ) {
        throw new ValidationError('A client certificate issuer is not permitted to issue TLS client-authentication certificates.');
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
        throw new ValidationError(`The certificate must contain exactly one Authup client URI SAN: ${expected}.`);
    }
}

function assertCertificateCurrent(certificate: X509Certificate): void {
    const now = Date.now();
    if (
        certificate.notBefore.getTime() > now ||
        certificate.notAfter.getTime() < now
    ) {
        throw new ValidationError('The client certificate is not currently valid.');
    }
}

function assertCertificateExtensionsUnderstood(certificate: X509Certificate): void {
    for (const extension of certificate.extensions) {
        if (extension.critical && !HANDLED_CRITICAL_EXTENSION_OIDS.has(extension.type)) {
            throw new ValidationError(
                `The certificate carries an unsupported critical extension (${extension.type}).`,
            );
        }
    }
}

function assertStrongSignature(certificate: X509Certificate): void {
    const hash = certificate.signatureAlgorithm?.hash?.name;
    if (typeof hash === 'string' && WEAK_SIGNATURE_HASHES.has(hash.toUpperCase())) {
        throw new ValidationError(`The certificate is signed with a weak algorithm (${hash}).`);
    }
}
