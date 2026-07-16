/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BearerTokenMalformedError } from '@authup/errors';
import type { ITokenVerifier, TokenVerificationData } from '@authup/server-adapter-kit';
import {
    describe, 
    expect, 
    it, 
    vi,
} from 'vitest';
import { verifySocket } from '../../src';
import type { Socket } from '../../src';

function createVerifier(impl: ITokenVerifier['verify']): ITokenVerifier {
    return { verify: impl };
}

function createSocket(auth: Record<string, any> = {}): Socket {
    return { handshake: { auth } } as Socket;
}

const sampleData: TokenVerificationData = {
    sub: 'user-1',
    permissions: [],
};

const verifyOptions = { certificateThumbprint: expect.any(Function) };

describe('verifySocket', () => {
    it('resolves with undefined when no token is present', async () => {
        const verify = vi.fn();
        const result = await verifySocket(createSocket(), { tokenVerifier: createVerifier(verify) });

        expect(result).toBeUndefined();
        expect(verify).not.toHaveBeenCalled();
    });

    it('resolves with verification data for a bare handshake token', async () => {
        const verify = vi.fn(async () => sampleData);
        const result = await verifySocket(createSocket({ token: 'abc.def.ghi' }), { tokenVerifier: createVerifier(verify) });

        expect(result).toBe(sampleData);
        expect(verify).toHaveBeenCalledWith('abc.def.ghi', verifyOptions);
    });

    it('strips a Bearer prefix from the handshake token', async () => {
        const verify = vi.fn(async () => sampleData);
        await verifySocket(createSocket({ token: 'Bearer abc.def.ghi' }), { tokenVerifier: createVerifier(verify) });

        expect(verify).toHaveBeenCalledWith('abc.def.ghi', verifyOptions);
    });

    // Binding enforcement lives inside TokenVerifier.verify() (see
    // @authup/server-adapter-kit's verifier.spec) — the wrapper only
    // forwards a lazy per-socket thumbprint provider.
    it('forwards a lazy certificate thumbprint provider into verify', async () => {
        const verify = vi.fn<ITokenVerifier['verify']>(async () => sampleData);
        const certificateThumbprintBySocket = vi.fn(async () => 'expected-thumbprint');

        const socket = createSocket({ token: 'abc' });
        await verifySocket(socket, {
            tokenVerifier: createVerifier(verify),
            certificateThumbprintBySocket,
        });

        expect(certificateThumbprintBySocket).not.toHaveBeenCalled();

        const [, options] = verify.mock.calls[0];
        const provider = options?.certificateThumbprint;
        expect(provider).toBeTypeOf('function');
        if (typeof provider === 'function') {
            await expect(provider()).resolves.toBe('expected-thumbprint');
            expect(certificateThumbprintBySocket).toHaveBeenCalledWith(socket);
        }
    });

    it('rejects with BearerTokenMalformedError on a malformed Bearer-prefixed token', async () => {
        const verify = vi.fn();
        let caught: unknown;
        try {
            await verifySocket(createSocket({ token: 'Bearer ' }), { tokenVerifier: createVerifier(verify) });
        } catch (e) {
            caught = e;
        }

        expect(caught).toBeInstanceOf(BearerTokenMalformedError);
        expect(verify).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by tokenVerifier.verify', async () => {
        const failure = new Error('verify failed');
        const verify = vi.fn(async () => {
            throw failure;
        });

        let caught: unknown;
        try {
            await verifySocket(createSocket({ token: 'bad-token' }), { tokenVerifier: createVerifier(verify) });
        } catch (e) {
            caught = e;
        }

        expect(caught).toBe(failure);
    });

    it('uses tokenBySocket as a fallback when handshake.auth.token is absent', async () => {
        const verify = vi.fn(async () => sampleData);
        const tokenBySocket = vi.fn(() => 'header-token');

        const socket = createSocket();
        const result = await verifySocket(socket, {
            tokenVerifier: createVerifier(verify),
            tokenBySocket,
        });

        expect(result).toBe(sampleData);
        expect(tokenBySocket).toHaveBeenCalledWith(socket);
        expect(verify).toHaveBeenCalledWith('header-token', verifyOptions);
    });

    it('does not invoke tokenBySocket when handshake.auth.token is present', async () => {
        const verify = vi.fn(async () => sampleData);
        const tokenBySocket = vi.fn();

        await verifySocket(createSocket({ token: 'abc' }), {
            tokenVerifier: createVerifier(verify),
            tokenBySocket,
        });

        expect(tokenBySocket).not.toHaveBeenCalled();
        expect(verify).toHaveBeenCalledWith('abc', verifyOptions);
    });
});
