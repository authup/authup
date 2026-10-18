/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import type { OAuth2JsonWebKey } from '@authup/specs';
import { isJWTError } from '@authup/specs';
import {
    SignJWT,
    UnsecuredJWT,
    base64url,
    exportJWK,
    generateKeyPair,
} from 'jose';
import {
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vitest,
} from 'vitest';
import { isVouchlyError } from 'vouchly';
import { TokenVerifier } from '../../src';
import { TokenPayload } from '../data/token';
import { FAKER_KEY_ID, Faker } from '../utils';

function encodeSegment(input: Record<string, any>) : string {
    return base64url.encode(JSON.stringify(input));
}

function buildPayload(input: Record<string, any> = {}) {
    const now = Math.floor(Date.now() / 1000);
    return {
        ...TokenPayload,
        iat: now,
        exp: now + 3600,
        ...input,
    };
}

const HEADER = encodeSegment({ alg: 'RS256', kid: FAKER_KEY_ID });

describe('verifier local', () => {
    let faker : Faker;
    let ecPrivateKey : CryptoKey;
    let ecJwk : OAuth2JsonWebKey;
    let verifier : TokenVerifier;
    let getJwk : ReturnType<typeof vitest.spyOn>;

    beforeAll(async () => {
        faker = new Faker();

        const pair = await generateKeyPair('ES256', { extractable: true });
        ecPrivateKey = pair.privateKey;
        ecJwk = {
            ...(await exportJWK(pair.publicKey)),
            alg: 'ES256',
            kid: FAKER_KEY_ID,
        } as OAuth2JsonWebKey;

        verifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            jwkCache: false,
        });

        getJwk = vitest.spyOn(Client.prototype, 'getJwk');
    });

    afterEach(() => {
        getJwk.mockReset();
    });

    it.each([
        'abc',
        'a.b',
        '!!!.e30.sig',
        `${HEADER}.!!!.sig`,
    ])('should reject malformed token %s with a JWTError', async (input) => {
        await expect(verifier.verifyLocal(input)).rejects.toSatisfy(isJWTError);
        expect(getJwk).not.toHaveBeenCalled();
    });

    it.each([
        ['trailing padding', (token: string) => `${token}==`],
        ['a space in the signature', (token: string) => `${token.slice(0, -4)} ${token.slice(-4)}`],
        ['a tab in the payload', (token: string) => {
            const [header, payload, signature] = token.split('.');
            return `${header}.${payload.slice(0, 4)}\t${payload.slice(4)}.${signature}`;
        }],
    ])('should reject a valid token altered by %s', async (_label, alter) => {
        const token = await faker.sign(buildPayload());

        await expect(verifier.verifyLocal(alter(token))).rejects.toSatisfy(isJWTError);
        expect(getJwk).not.toHaveBeenCalled();
    });

    it('should reject a realm key without an algorithm with a JWTError', async () => {
        const jwk : Partial<OAuth2JsonWebKey> = { ...await faker.useJwk() };
        delete jwk.alg;
        getJwk.mockResolvedValueOnce(jwk);

        await expect(verifier.verifyLocal(await faker.sign(buildPayload()))).rejects.toSatisfy(isJWTError);
    });

    it('should reject an RSA realm key shorter than 2048 bits with a JWTError naming the cause', async () => {
        const pair = await crypto.subtle.generateKey(
            {
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 1024,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256',
            },
            true,
            ['sign', 'verify'],
        );
        getJwk.mockResolvedValueOnce({
            ...(await exportJWK(pair.publicKey)),
            alg: 'RS256',
            kid: FAKER_KEY_ID,
        });

        await expect(verifier.verifyLocal(await faker.sign(buildPayload()))).rejects.toSatisfy(
            (e: unknown) => isJWTError(e) && /2048/.test(e.message),
        );
    });

    it('should report a token expired within the clock leeway as expired', async () => {
        getJwk.mockResolvedValueOnce(await faker.useJwk());

        const token = await faker.sign(buildPayload({ exp: Math.floor(Date.now() / 1000) - 30 }));

        await expect(verifier.verifyLocal(token)).rejects.toMatchObject({ code: ErrorCode.JWT_EXPIRED });
    });

    it('should reject an unsecured token', async () => {
        getJwk.mockResolvedValueOnce(await faker.useJwk());

        const unsecured = new UnsecuredJWT(buildPayload()).encode();
        const [, payload] = unsecured.split('.');
        const token = `${encodeSegment({ alg: 'none', kid: FAKER_KEY_ID })}.${payload}.`;

        await expect(verifier.verifyLocal(token)).rejects.toSatisfy(
            (e: unknown) => isJWTError(e) && e.code !== ErrorCode.JWT_EXPIRED,
        );
    });

    it('should verify a token signed by an EC realm key', async () => {
        getJwk.mockResolvedValueOnce(ecJwk);

        const token = await new SignJWT(buildPayload())
            .setProtectedHeader({ alg: 'ES256', kid: FAKER_KEY_ID })
            .sign(ecPrivateKey);

        const output = await verifier.verifyLocal(token);
        expect(output.sub).toEqual(TokenPayload.sub);
    });

    it('should reject a token that is not yet valid as invalid, not expired', async () => {
        getJwk.mockResolvedValueOnce(await faker.useJwk());

        const token = await faker.sign(buildPayload({ nbf: Math.floor(Date.now() / 1000) + 3600 }));

        await expect(verifier.verifyLocal(token)).rejects.toSatisfy(
            (e: unknown) => isJWTError(e) && e.code !== ErrorCode.JWT_EXPIRED,
        );
    });

    it('should accept a token whose nbf lies within the 60 second clock leeway', async () => {
        getJwk.mockResolvedValueOnce(await faker.useJwk());

        const token = await faker.sign(buildPayload({ nbf: Math.floor(Date.now() / 1000) + 30 }));

        const output = await verifier.verifyLocal(token);
        expect(output.sub).toEqual(TokenPayload.sub);
    });

    it('should decode a payload with non-ASCII claims', async () => {
        getJwk.mockResolvedValueOnce(await faker.useJwk());

        const token = await faker.sign(buildPayload({ name: 'Пётр' }));

        const output = await verifier.verifyLocal(token);
        expect(output.name).toEqual('Пётр');
        expect(getJwk).toHaveBeenCalledWith(FAKER_KEY_ID, TokenPayload.realm_id);
    });

    it('should reject a token whose algorithm differs from the realm key', async () => {
        getJwk.mockResolvedValueOnce(ecJwk);

        const token = await faker.sign(buildPayload());

        await expect(verifier.verifyLocal(token)).rejects.toSatisfy(isJWTError);
    });

    it.each([
        ['a malformed token', async () => 'a.b'],
        ['a token naming no realm', async () => {
            const payload : Record<string, any> = buildPayload();
            delete payload.realm_id;
            return faker.sign(payload);
        }],
        ['a kid that is no uuid', async () => faker.sign(buildPayload(), '../users')],
        ['an unknown kid', async () => {
            getJwk.mockRejectedValueOnce(Object.assign(new Error('not found'), { response: { status: 404 } }));
            return faker.sign(buildPayload());
        }],
        ['a failed key fetch', async () => {
            getJwk.mockRejectedValueOnce(new Error('ECONNRESET'));
            return faker.sign(buildPayload());
        }],
        ['a forged signature', async () => {
            getJwk.mockResolvedValueOnce(await new Faker().useJwk());
            return faker.sign(buildPayload());
        }],
        ['an expired token', async () => {
            getJwk.mockResolvedValueOnce(await faker.useJwk());
            return faker.sign(buildPayload({ exp: Math.floor(Date.now() / 1000) - 3600 }));
        }],
        ['a refresh token', async () => {
            getJwk.mockResolvedValueOnce(await faker.useJwk());
            return faker.sign(buildPayload({ kind: 'refresh_token' }));
        }],
        ['a certificate-bound token without a thumbprint', async () => {
            getJwk.mockResolvedValueOnce(await faker.useJwk());
            return faker.sign(buildPayload({ cnf: { 'x5t#S256': 'thumbprint' } }));
        }],
    ])('should reject %s with a JWTError, never a VouchlyError', async (_label, build) => {
        const token = await build();

        await expect(verifier.verify(token)).rejects.toSatisfy(
            (e: unknown) => isJWTError(e) && !isVouchlyError(e),
        );
    });

    it('should reject a token signed by another key of the same algorithm', async () => {
        getJwk.mockResolvedValueOnce(await new Faker().useJwk());

        const token = await faker.sign(buildPayload());

        await expect(verifier.verifyLocal(token)).rejects.toSatisfy(isJWTError);
    });
});
