/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/security';
import type { JWTClaims } from '@authup/security';
import {
    CryptoAsymmetricAlgorithm,
    SymmetricAlgorithm,
    createAsymmetricKeyPair,
    createSymmetricKey,
    extractTokenHeader,
    extractTokenPayload,
    signToken, verifyToken,
} from '../../src';

describe('src/json-web-token', () => {
    let keyPair : CryptoKeyPair;
    let key : CryptoKey;

    beforeAll(async () => {
        keyPair = await createAsymmetricKeyPair({
            name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5,
        });
        key = await createSymmetricKey({
            name: SymmetricAlgorithm.HMAC,
        });
    });

    it('should sign and decrypt with asymmetric keyPair', async () => {
        const data : JWTClaims = { text: 'secretText' };

        const signedText = await signToken(data, {
            type: 'rsa',
            key: keyPair.privateKey,
        });

        const decoded = await verifyToken(signedText, {
            type: 'rsa',
            key: keyPair.publicKey,
        });

        expect(decoded).toBeDefined();
        expect(decoded.text).toEqual(data.text);
    });

    it('should sign and decrypt with symmetric key', async () => {
        const data : JWTClaims = { text: 'secretText', foo_bar: 'baz' };

        const signedText = await signToken(data, {
            type: 'oct',
            key,
        });

        const decoded = await verifyToken(signedText, {
            type: 'oct',
            key,
        });

        expect(decoded).toBeDefined();
        expect(decoded.text).toEqual(data.text);
        expect(decoded.foo_bar).toEqual(data.foo_bar);

        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');
    });

    it('sign and not verify token (expired)', async () => {
        const data : JWTClaims = {
            exp: 1000,
        };

        const signedText = await signToken(data, {
            type: 'rsa',
            key: keyPair.privateKey,
        });

        await expect(async () => {
            await verifyToken(signedText, {
                type: 'rsa',
                key: keyPair.publicKey,
            });
        }).rejects.toThrow(TokenError.expired());
    });

    it('sign and not verify token (not active before)', async () => {
        const data : JWTClaims = {
            nbf: Math.floor(new Date().getTime() / 1000) + 3600,
        };

        const signedText = await signToken(data, {
            type: 'rsa',
            key: keyPair.privateKey,
        });

        await expect(async () => {
            await verifyToken(signedText, {
                type: 'rsa',
                key: keyPair.publicKey,
            });
        }).rejects.toThrow(TokenError.notActiveBefore());
    });

    it('not verify token', async () => {
        await expect(async () => {
            await verifyToken('foo.bar.baz', {
                type: 'rsa',
                key: keyPair.publicKey,
            });
        }).rejects.toThrow(TokenError);
    });

    it('should sign and decode header', async () => {
        const data : JWTClaims = { text: 'secretText' };

        const signedText = await signToken(data, {
            type: 'rsa',
            key: keyPair.privateKey,
            keyId: 'foo',
        });

        const header = extractTokenHeader(signedText);
        expect(header).toBeDefined();
        expect(header.typ).toEqual('JWT');
        expect(header.alg).toEqual('RS256');
        expect(header.kid).toEqual('foo');
    });

    it('should sign and decode payload', async () => {
        const data : JWTClaims = { text: 'secretText' };

        const signedText = await signToken(data, {
            type: 'rsa',
            key: keyPair.privateKey,
        });

        const header = extractTokenPayload(signedText);
        expect(header).toBeDefined();
        expect(header.text).toEqual(data.text);
        expect(header.exp).toBeDefined();
        expect(header.iat).toBeDefined();
    });

    it('not decode header', async () => {
        expect(() => extractTokenHeader('foo.bar.baz')).toThrow();
    });

    it('not decode payload', () => {
        expect(() => extractTokenPayload('foo.bar.baz')).toThrow();
    });
});
