/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { JWTClaims } from '@authup/kit';
import { TokenError } from '@authup/errors';
import path from 'node:path';
import type { KeyPairOptions } from '../../src';
import {
    deleteKeyPair,
    extractTokenHeader,
    extractTokenPayload,
    signToken,
    verifyToken,
} from '../../src';

describe('src/json-web-token', () => {
    const directory = path.join(__dirname, '..', '..', 'writable');

    it('should sign and decrypt', async () => {
        const data : JWTClaims = { text: 'secretText' };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: {
                directory,
            },
        });

        const decoded = await verifyToken(signedText, {
            type: 'rsa',
            keyPair: {
                directory,
            },
        });

        expect(decoded).toBeDefined();
        expect(decoded.text).toEqual(data.text);

        await deleteKeyPair({
            directory,
        });
    });

    it('should sign and decrypt with passphrase', async () => {
        const data : JWTClaims = { text: 'secretText', foo_bar: 'baz' };
        const keyPairOptions : Partial<KeyPairOptions> = {
            passphrase: 'start123',
            privateName: 'private-passphrase',
            publicName: 'public-passphrase',
            directory,
        };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: keyPairOptions,
        });

        const decoded = await verifyToken(signedText, {
            type: 'rsa',
            keyPair: keyPairOptions,
        });

        expect(decoded).toBeDefined();
        expect(decoded.text).toEqual(data.text);
        expect(decoded.foo_bar).toEqual(data.foo_bar);

        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');

        await deleteKeyPair(keyPairOptions);
    });

    it('sign and not verify token (expired)', async () => {
        const data : JWTClaims = {
            exp: 1000,
        };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: {
                directory,
            },
        });

        await expect(async () => {
            await verifyToken(signedText, {
                type: 'rsa',
                keyPair: {
                    directory,
                },
            });
        }).rejects.toThrow(TokenError.expired());
    });

    it('sign and not verify token (not active before)', async () => {
        const data : JWTClaims = {
            nbf: Math.floor(new Date().getTime() / 1000) + 3600,
        };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: {
                directory,
            },
        });

        await expect(async () => {
            await verifyToken(signedText, {
                type: 'rsa',
                keyPair: {
                    directory,
                },
            });
        }).rejects.toThrow(TokenError.notActiveBefore());
    });

    it('not verify token', async () => {
        await expect(async () => {
            await verifyToken('foo.bar.baz', {
                type: 'rsa',
                keyPair: {
                    directory,
                },
            });
        }).rejects.toThrow(TokenError);
    });

    it('should sign and decode header', async () => {
        const data : JWTClaims = { text: 'secretText' };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: {
                directory,
            },
            keyId: 'foo',
        });

        const header = extractTokenHeader(signedText);
        expect(header).toBeDefined();
        expect(header.typ).toEqual('JWT');
        expect(header.alg).toEqual('RS256');
        expect(header.kid).toEqual('foo');

        await deleteKeyPair({
            directory,
        });
    });

    it('should sign and decode payload', async () => {
        const data : JWTClaims = { text: 'secretText' };

        const signedText = await signToken(data, {
            type: 'rsa',
            keyPair: {
                directory,
            },
        });

        const header = extractTokenPayload(signedText);
        expect(header).toBeDefined();
        expect(header.text).toEqual(data.text);
        expect(header.exp).toBeDefined();
        expect(header.iat).toBeDefined();

        await deleteKeyPair({
            directory,
        });
    });

    it('not decode header', async () => {
        expect(() => extractTokenHeader('foo.bar.baz')).toThrow();
    });

    it('not decode payload', () => {
        expect(() => extractTokenPayload('foo.bar.baz')).toThrow();
    });
});
