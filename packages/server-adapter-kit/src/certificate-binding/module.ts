/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenPayload } from '@authup/specs';
import { JWTError } from '@authup/specs';

/**
 * Resource-server check for RFC 8705 certificate-bound tokens. Certificate
 * chain trust belongs at issuance; consumers only match the presented leaf's
 * SHA-256 DER thumbprint against the signed `cnf.x5t#S256` claim.
 */
export function assertTokenCertificateBinding(
    payload: Pick<OAuth2TokenPayload, 'cnf'>,
    certificateThumbprint?: string,
): void {
    if (!payload.cnf) {
        return;
    }

    const expected = payload.cnf['x5t#S256'];
    if (
        typeof expected !== 'string' ||
        !certificateThumbprint ||
        certificateThumbprint !== expected ||
        expected.length === 0
    ) {
        throw JWTError.invalid();
    }
}
