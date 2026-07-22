/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import '../../../core/client-certificate/reflect.ts';
import { X509Certificate } from '@peculiar/x509';
import { BadRequestError } from '@authup/errors';
import { base64ToArrayBuffer } from '@authup/kit';
import type { IAppEvent } from 'routup';
import type { ClientCertificateEvidence } from '../../../core/index.ts';
import {
    buildClientCertificateThumbprint,
    parseClientCertificateChain,
} from '../../../core/index.ts';
import type { CertificateSource } from './types.ts';

const MAX_CERTIFICATE_HEADER_LENGTH = 128 * 1024;
const MAX_CERTIFICATE_CHAIN_LENGTH = 10;
const STRUCTURED_BINARY_PATTERN = /^:([A-Za-z0-9+/]*={0,2}):$/;

export async function extractClientCertificateEvidence(
    event: IAppEvent,
    source: CertificateSource,
): Promise<ClientCertificateEvidence | undefined> {
    if (source === 'disabled') {
        return undefined;
    }

    let result: Omit<ClientCertificateEvidence, 'thumbprint'> | undefined;
    if (source === 'standard') {
        result = extractStandardEvidence(event);
    } else if (source === 'forwarded') {
        result = extractForwardedEvidence(event);
    } else {
        throw new BadRequestError('The client certificate source is not configured correctly.');
    }
    if (!result) {
        return undefined;
    }

    return {
        ...result,
        thumbprint: await buildClientCertificateThumbprint(result.certificate),
    };
}

function extractStandardEvidence(
    event: IAppEvent,
): Omit<ClientCertificateEvidence, 'thumbprint'> | undefined {
    const leafHeader = event.headers.get('client-cert');
    const chainHeader = event.headers.get('client-cert-chain');

    if (!leafHeader) {
        if (chainHeader) {
            throw certificateHeaderError();
        }
        return undefined;
    }

    assertHeaderLength(leafHeader);
    const certificate = parseStructuredCertificate(leafHeader);
    const chain = chainHeader ? parseStructuredCertificateList(chainHeader) : [];

    return { certificate, chain };
}

function extractForwardedEvidence(
    event: IAppEvent,
): Omit<ClientCertificateEvidence, 'thumbprint'> | undefined {
    const value = event.headers.get('x-forwarded-tls-client-cert');
    if (!value) {
        return undefined;
    }

    assertHeaderLength(value);

    let pem: string;
    try {
        // Native raw PEM is useful in tests and a few proxy integrations. The
        // NGINX/Traefik contract is escaped PEM: query-style `+` represents a
        // space, while literal base64 plus signs arrive as `%2B`.
        pem = value.includes('-----BEGIN CERTIFICATE-----') ?
            value :
            decodeURIComponent(value.replace(/\+/g, '%20'));
    } catch {
        throw certificateHeaderError();
    }

    let certificates: X509Certificate[];
    try {
        certificates = parseClientCertificateChain(pem);
    } catch {
        throw certificateHeaderError();
    }

    if (certificates.length !== 1 || !certificates[0]) {
        throw certificateHeaderError();
    }

    return {
        certificate: certificates[0],
        chain: [],
    };
}

function parseStructuredCertificateList(value: string): X509Certificate[] {
    assertHeaderLength(value);
    const items = value.split(',').map((item) => item.trim());
    if (items.length > MAX_CERTIFICATE_CHAIN_LENGTH || items.some((item) => item.length === 0)) {
        throw certificateHeaderError();
    }

    return items.map(parseStructuredCertificate);
}

function parseStructuredCertificate(value: string): X509Certificate {
    const match = STRUCTURED_BINARY_PATTERN.exec(value.trim());
    if (!match?.[1]) {
        throw certificateHeaderError();
    }

    try {
        const raw = base64ToArrayBuffer(match[1]);
        if (raw.byteLength === 0) {
            throw certificateHeaderError();
        }

        const certificate = new X509Certificate(raw);
        if (
            certificate.toString('base64').replace(/=+$/, '') !==
            match[1].replace(/=+$/, '')
        ) {
            throw certificateHeaderError();
        }

        return certificate;
    } catch {
        throw certificateHeaderError();
    }
}

function assertHeaderLength(value: string): void {
    if (value.length > MAX_CERTIFICATE_HEADER_LENGTH) {
        throw certificateHeaderError();
    }
}

function certificateHeaderError(): BadRequestError {
    return new BadRequestError('The forwarded client certificate header is malformed.');
}
