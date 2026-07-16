/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IncomingMessage } from 'node:http';
import { BearerTokenMalformedError } from '@authup/errors';
import type { ITokenVerifier, TokenVerificationData } from '@authup/server-adapter-kit';
import {
    describe, 
    expect, 
    it, 
    vi,
} from 'vitest';
import { verifyRequest } from '../../src';

function createVerifier(impl: ITokenVerifier['verify']): ITokenVerifier {
    return { verify: impl };
}

function createRequest(headers: Record<string, string> = {}): IncomingMessage {
    return { headers } as IncomingMessage;
}

const sampleData: TokenVerificationData = {
    sub: 'user-1',
    permissions: [],
};

const verifyOptions = { certificateThumbprint: expect.any(Function) };

describe('verifyRequest (node)', () => {
    it('resolves with undefined when no Authorization header and no fallback token', async () => {
        const verifier = createVerifier(vi.fn());
        const result = await verifyRequest(createRequest(), { tokenVerifier: verifier });

        expect(result).toBeUndefined();
        expect(verifier.verify).not.toHaveBeenCalled();
    });

    it('resolves with verification data for a valid Bearer header', async () => {
        const verify = vi.fn(async () => sampleData);
        const result = await verifyRequest(
            createRequest({ authorization: 'Bearer abc.def.ghi' }),
            { tokenVerifier: createVerifier(verify) },
        );

        expect(result).toBe(sampleData);
        expect(verify).toHaveBeenCalledWith('abc.def.ghi', verifyOptions);
    });

    // Binding enforcement lives inside TokenVerifier.verify() (see
    // @authup/server-adapter-kit's verifier.spec) — the wrapper only
    // forwards a lazy per-request thumbprint provider.
    it('forwards a lazy certificate thumbprint provider into verify', async () => {
        const verify = vi.fn<ITokenVerifier['verify']>(async () => sampleData);
        const certificateThumbprintByRequest = vi.fn(async () => 'expected-thumbprint');

        const req = createRequest({ authorization: 'Bearer abc' });
        await verifyRequest(req, {
            tokenVerifier: createVerifier(verify),
            certificateThumbprintByRequest,
        });

        expect(certificateThumbprintByRequest).not.toHaveBeenCalled();

        const [, options] = verify.mock.calls[0];
        const provider = options?.certificateThumbprint;
        expect(provider).toBeTypeOf('function');
        if (typeof provider === 'function') {
            await expect(provider()).resolves.toBe('expected-thumbprint');
            expect(certificateThumbprintByRequest).toHaveBeenCalledWith(req);
        }
    });

    it('rejects with BearerTokenMalformedError for a malformed Authorization header', async () => {
        const verify = vi.fn();
        let caught: unknown;
        try {
            await verifyRequest(
                createRequest({ authorization: 'Basic dXNlcjpwYXNz' }),
                { tokenVerifier: createVerifier(verify) },
            );
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
            await verifyRequest(
                createRequest({ authorization: 'Bearer bad-token' }),
                { tokenVerifier: createVerifier(verify) },
            );
        } catch (e) {
            caught = e;
        }

        expect(caught).toBe(failure);
    });

    it('uses tokenByRequest as a fallback when the Authorization header is absent', async () => {
        const verify = vi.fn(async () => sampleData);
        const tokenByRequest = vi.fn(() => 'cookie-token');

        const req = createRequest();
        const result = await verifyRequest(req, {
            tokenVerifier: createVerifier(verify),
            tokenByRequest,
        });

        expect(result).toBe(sampleData);
        expect(tokenByRequest).toHaveBeenCalledWith(req);
        expect(verify).toHaveBeenCalledWith('cookie-token', verifyOptions);
    });

    it('does not invoke tokenByRequest when the Authorization header is present', async () => {
        const verify = vi.fn(async () => sampleData);
        const tokenByRequest = vi.fn();

        await verifyRequest(
            createRequest({ authorization: 'Bearer abc' }),
            {
                tokenVerifier: createVerifier(verify),
                tokenByRequest,
            },
        );

        expect(tokenByRequest).not.toHaveBeenCalled();
        expect(verify).toHaveBeenCalledWith('abc', verifyOptions);
    });

    it('accepts a tokenByRequest value that already starts with Bearer', async () => {
        const verify = vi.fn(async () => sampleData);
        const tokenByRequest = vi.fn(() => 'Bearer cookie-token');

        await verifyRequest(createRequest(), {
            tokenVerifier: createVerifier(verify),
            tokenByRequest,
        });

        expect(verify).toHaveBeenCalledWith('cookie-token', verifyOptions);
    });

    it('treats opaque tokens that share the "Bearer" prefix-letters as bare tokens', async () => {
        const verify = vi.fn(async () => sampleData);
        const tokenByRequest = vi.fn(() => 'BearerLooksFakeButOpaque');

        await verifyRequest(createRequest(), {
            tokenVerifier: createVerifier(verify),
            tokenByRequest,
        });

        expect(verify).toHaveBeenCalledWith('BearerLooksFakeButOpaque', verifyOptions);
    });
});
