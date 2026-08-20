/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { X509Certificate, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Realm } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { ClientEntity } from '../../../../../../src/adapters/database/index.ts';
import { createTestApplication } from '../../../../../app/index.ts';
import { createFakeClient, httpRequest } from '../../../../../utils/index.ts';

const TLS_CLIENT_ID = '00000000-0000-4000-8000-000000000072';

function readCertificate(name: string): string {
    return readFileSync(
        new URL(`../../../../../data/certificates/${name}`, import.meta.url),
        'utf8',
    );
}

const ROOT_PEM = readCertificate('certificate.pem');
const INTERMEDIATE_PEM = readCertificate('client-intermediate.pem');
const LEAF_PEM = readCertificate('client-leaf.pem');
const WRONG_LEAF_PEM = readCertificate('client-wrong-leaf.pem');
const SELF_SIGNED_LEAF_PEM = readCertificate('non-ca-certificate.pem');

function structured(certificatePEM: string): string {
    return `:${new X509Certificate(certificatePEM).raw.toString('base64')}:`;
}

function decodeJwtPayload(token: string): OAuth2TokenPayload {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'));
}

function certificateHeaders(leafPEM: string, chainPEM?: string): Record<string, string> {
    return {
        'client-cert': structured(leafPEM),
        ...(chainPEM ? { 'client-cert-chain': structured(chainPEM) } : {}),
    };
}

describe('OAuth2 TLS client authentication and certificate-bound tokens', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.certificateSource = 'standard';
            config.mtlsPublicUrl = 'https://mtls.example.com/';
        },
    });

    let realm: Realm;

    beforeAll(async () => {
        await suite.setup();
        realm = (await suite.client.realm.getOne('master')).data;

        await suite.client.trustAnchor.create({
            name: 'oauth-client-root',
            certificate: ROOT_PEM,
            realmId: realm.id,
        });

        await suite.dataSource.getRepository(ClientEntity).save({
            id: TLS_CLIENT_ID,
            name: 'tls-client',
            active: true,
            authMethod: 'tls',
            tokenBindingMethod: 'tls',
            grantTypes: 'client_credentials',
            realmId: realm.id,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('advertises TLS client authentication and the configured mTLS aliases', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            `/realms/${realm.id}/.well-known/openid-configuration`,
        );
        expect(response.status).toBe(200);

        const discovery = await response.json() as Record<string, any>;
        expect(discovery.token_endpoint_auth_methods_supported).toContain('tls_client_auth');
        expect(discovery.tls_client_certificate_bound_access_tokens).toBe(true);
        expect(discovery.mtls_endpoint_aliases.token_endpoint)
            .toBe('https://mtls.example.com/token');
    });

    it('authenticates a client through its trusted chain and binds the issued access token', async () => {
        const form = {
            grant_type: 'client_credentials',
            client_id: TLS_CLIENT_ID,
            realm_id: realm.id,
        };

        const withoutCertificate = await httpRequest(suite, 'POST', '/token', { form });
        expect(withoutCertificate.status).toBe(401);

        const response = await httpRequest(suite, 'POST', '/token', {
            form,
            headers: certificateHeaders(LEAF_PEM, INTERMEDIATE_PEM),
        });
        expect(response.status).toBe(200);

        const tokens = await response.json() as OAuth2TokenGrantResponse;
        const payload = decodeJwtPayload(tokens.access_token);
        expect(payload.cnf?.['x5t#S256']).toEqual(
            createHash('sha256')
                .update(new X509Certificate(LEAF_PEM).raw)
                .digest('base64url'),
        );

        // A bound token presented without its certificate is an unusable
        // bearer on a resource route, so it answers 401 (RFC 6750 3.1) like
        // every other JWT failure.
        const protectedByAuthorizationMiddleware = `/realms/${realm.id}/.well-known/openid-configuration`;
        const withoutBoundCertificate = await httpRequest(suite, 'GET', protectedByAuthorizationMiddleware, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
        expect(withoutBoundCertificate.status).toBe(401);

        const withWrongCertificate = await httpRequest(suite, 'GET', protectedByAuthorizationMiddleware, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                ...certificateHeaders(WRONG_LEAF_PEM),
            },
        });
        expect(withWrongCertificate.status).toBe(401);

        const withBoundCertificate = await httpRequest(suite, 'GET', protectedByAuthorizationMiddleware, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                ...certificateHeaders(LEAF_PEM, INTERMEDIATE_PEM),
            },
        });
        expect(withBoundCertificate.status).toBe(200);
    });

    it('accepts an untrusted self-signed certificate for binding and requires it again on refresh', async () => {
        const { data: client } = await suite.client.client.create(createFakeClient({
            authMethod: 'none',
            tokenBindingMethod: 'tls',
            secret: null,
            realmId: realm.id,
            grantTypes: 'password refresh_token',
        }));

        const login = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                client_id: client.id,
                realm_id: realm.id,
                username: 'admin',
                password: 'start123',
            },
            headers: certificateHeaders(SELF_SIGNED_LEAF_PEM),
        });
        expect(login.status).toBe(200);

        const tokens = await login.json() as OAuth2TokenGrantResponse;
        expect(tokens.refresh_token).toBeDefined();
        expect(decodeJwtPayload(tokens.access_token).cnf?.['x5t#S256']).toBeTruthy();
        expect(decodeJwtPayload(tokens.refresh_token!).cnf)
            .toEqual(decodeJwtPayload(tokens.access_token).cnf);

        const withoutCertificate = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: tokens.refresh_token!,
                client_id: client.id,
                realm_id: realm.id,
            },
        });
        expect(withoutCertificate.status).toBe(401);

        const refreshed = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: tokens.refresh_token!,
                client_id: client.id,
                realm_id: realm.id,
            },
            headers: certificateHeaders(SELF_SIGNED_LEAF_PEM),
        });
        expect(refreshed.status).toBe(200);
    });
});
