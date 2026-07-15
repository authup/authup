/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2ClientError } from '@authup/specs';
import type { IAppEvent } from 'routup';
import type { ClientCertificateEvidence } from '../../../../../../core/index.ts';
import {
    type CertificateSource,
    extractClientCertificateEvidence,
} from '../../../../request/index.ts';

export function extractOAuth2ClientCertificateEvidence(
    event: IAppEvent,
    source: CertificateSource,
): ClientCertificateEvidence | undefined {
    try {
        return extractClientCertificateEvidence(event, source);
    } catch {
        throw OAuth2ClientError.invalid();
    }
}
