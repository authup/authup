/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { X509Certificate } from 'node:crypto';
import type { ITrustAnchorRepository } from '../entities/index.ts';

/**
 * Vendor-neutral evidence derived from the certificate used in the external
 * client-facing TLS handshake. `chain` excludes the leaf and is ordered as it
 * appeared on the wire when the forwarding format preserves that order.
 */
export type ClientCertificateEvidence = {
    certificate: X509Certificate,
    chain: X509Certificate[],
    thumbprint: string,
};

export type ClientCertificateValidatorContext = {
    trustAnchorRepository: Pick<ITrustAnchorRepository, 'findManyBy'>,
};
