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

    it('should decode a payload with non-ASCII claims', async () => {
        getJwk.mockResolvedValueOnce(await faker.useJwk());

        const token = await faker.sign(buildPayload({ name: 'Пётр' }));

        const output = await verifier.verifyLocal(token);
        expect(output.name).toEqual('Пётр');
        expect(getJwk).toHaveBeenCalledWith(FAKER_KEY_ID, TokenPayload.realm_id);
    });

    it('should reject a token signed by another key', async () => {
        getJwk.mockResolvedValueOnce(ecJwk);

        const token = await faker.sign(buildPayload());

        await expect(verifier.verifyLocal(token)).rejects.toSatisfy(isJWTError);
    });
});
