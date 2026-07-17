/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFileSync } from 'node:fs';
import { X509Certificate } from '@peculiar/x509';
import type { Client, TrustAnchor } from '@authup/core-kit';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { IAppEvent } from 'routup';
import {
    type ClientCertificateEvidence,
    ClientCertificateValidator,
    buildClientCertificateThumbprint,
} from '../../../../src/core/client-certificate/index.ts';
import { extractClientCertificateEvidence } from '../../../../src/adapters/http/request/index.ts';

const CLIENT_ID = '00000000-0000-4000-8000-000000000072';
const REALM_ID = '00000000-0000-4000-8000-000000000001';

function readCertificate(name: string): string {
    return readFileSync(
        new URL(`../../../data/certificates/${name}`, import.meta.url),
        'utf8',
    );
}

const ROOT_PEM = readCertificate('certificate.pem');
const INTERMEDIATE_PEM = readCertificate('client-intermediate.pem');
const LEAF_PEM = readCertificate('client-leaf.pem');
const DIRECT_LEAF_PEM = readCertificate('client-direct-leaf.pem');
const WRONG_LEAF_PEM = readCertificate('client-wrong-leaf.pem');
const SELF_SIGNED_LEAF_PEM = readCertificate('non-ca-certificate.pem');

function evidence(leafPEM: string, chainPEMs: string[] = []): ClientCertificateEvidence {
    const certificate = new X509Certificate(leafPEM);
    return {
        certificate,
        chain: chainPEMs.map((pem) => new X509Certificate(pem)),
        thumbprint: 'unused-by-validator',
    };
}

function createValidator(enabled = true, crypto?: Crypto) {
    const anchor = {
        certificate: ROOT_PEM,
        enabled,
        realmId: REALM_ID,
    } as TrustAnchor;
    const findManyBy = vi.fn(async () => (enabled ? [anchor] : []));

    return {
        findManyBy,
        validator: new ClientCertificateValidator({
            trustAnchorRepository: { findManyBy },
            crypto,
        }),
    };
}

function client(): Pick<Client, 'id' | 'realmId'> {
    return { id: CLIENT_ID, realmId: REALM_ID };
}

function event(headers: HeadersInit): IAppEvent {
    return { headers: new Headers(headers) } as unknown as IAppEvent;
}

function structured(certificatePEM: string): string {
    return `:${new X509Certificate(certificatePEM).toString('base64')}:`;
}

describe('ClientCertificateValidator', () => {
    it('accepts a directly trusted client certificate with the exact client URI SAN', async () => {
        const { validator, findManyBy } = createValidator();

        await expect(validator.validateForAuthentication(client(), evidence(DIRECT_LEAF_PEM)))
            .resolves.toBeUndefined();
        expect(findManyBy).toHaveBeenCalledWith({ realmId: REALM_ID, enabled: true });
    });

    it('accepts a supplied intermediate chain and permits unrelated SAN entries', async () => {
        const { validator } = createValidator();

        await expect(validator.validateForAuthentication(
            client(),
            evidence(LEAF_PEM, [INTERMEDIATE_PEM]),
        )).resolves.toBeUndefined();
    });

    it('uses the configured WebCrypto provider for certificate signatures', async () => {
        const verify = vi.fn(async () => false);
        const subtle = new Proxy(globalThis.crypto.subtle, {
            get(target, property) {
                if (property === 'verify') {
                    return verify;
                }

                const value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
        const crypto = {
            getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
            randomUUID: globalThis.crypto.randomUUID.bind(globalThis.crypto),
            subtle,
        } as Crypto;
        const { validator } = createValidator(true, crypto);

        await expect(validator.validateForAuthentication(client(), evidence(DIRECT_LEAF_PEM)))
            .rejects.toThrow();
        expect(verify).toHaveBeenCalled();
    });

    it('rejects a missing intermediate, an untrusted realm, and the wrong client URI', async () => {
        const { validator } = createValidator();
        const { validator: untrustedValidator } = createValidator(false);

        await expect(validator.validateForAuthentication(client(), evidence(LEAF_PEM)))
            .rejects.toThrow();
        await expect(untrustedValidator.validateForAuthentication(client(), evidence(DIRECT_LEAF_PEM)))
            .rejects.toThrow();
        await expect(validator.validateForAuthentication(client(), evidence(WRONG_LEAF_PEM)))
            .rejects.toThrow();
    });

    it('accepts a current self-signed leaf for token binding without trusting its issuer', () => {
        const { validator, findManyBy } = createValidator(false);

        expect(() => validator.validateForBinding(evidence(SELF_SIGNED_LEAF_PEM)))
            .not.toThrow();
        expect(findManyBy).not.toHaveBeenCalled();
    });
});

describe('extractClientCertificateEvidence', () => {
    it('reads RFC 9440 structured leaf and chain headers', async () => {
        const result = await extractClientCertificateEvidence(event({
            'client-cert': structured(LEAF_PEM),
            'client-cert-chain': structured(INTERMEDIATE_PEM),
        }), 'standard');

        expect(result?.certificate.toString('base64')).toEqual(new X509Certificate(LEAF_PEM).toString('base64'));
        expect(result?.chain).toHaveLength(1);
        expect(result?.thumbprint).toEqual(
            await buildClientCertificateThumbprint(new X509Certificate(LEAF_PEM)),
        );
    });

    it('reads one URL-escaped forwarded PEM and rejects a forwarded chain', async () => {
        const result = await extractClientCertificateEvidence(event({ 'x-forwarded-tls-client-cert': encodeURIComponent(DIRECT_LEAF_PEM) }), 'forwarded');
        expect(result?.chain).toEqual([]);

        await expect(extractClientCertificateEvidence(event({ 'x-forwarded-tls-client-cert': encodeURIComponent(`${DIRECT_LEAF_PEM}${ROOT_PEM}`) }), 'forwarded')).rejects.toThrow();
    });

    it('does not fall back between configured sources and rejects malformed evidence', async () => {
        await expect(extractClientCertificateEvidence(event({ 'x-forwarded-tls-client-cert': encodeURIComponent(DIRECT_LEAF_PEM) }), 'standard')).resolves.toBeUndefined();

        await expect(extractClientCertificateEvidence(event({ 'client-cert': structured(DIRECT_LEAF_PEM) }), 'disabled')).resolves.toBeUndefined();

        await expect(extractClientCertificateEvidence(event({ 'client-cert': ':not-base64:' }), 'standard')).rejects.toThrow();
    });
});
