/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ErrorCode,
    UpstreamError,
    isUpstreamError,
    isUpstreamTimeoutError,
} from '@authup/errors';
import { JWTError, isJWTError } from '@authup/specs';
import { VouchlyError, VouchlyErrorCode, isVouchlyError } from 'vouchly';
import { describe, expect, it } from 'vitest';
import type { TransportRequest } from 'hapic';
import { MemoryTransport, createClient, isClientErrorDueTimeout } from 'hapic';
import { toVerificationError } from '../../src/verifier/error.ts';

async function createClientTimeoutError() : Promise<unknown> {
    const client = createClient({
        baseURL: 'http://authup.test',
        timeout: 1,
        transport: new MemoryTransport({
            fetch: (request: TransportRequest) => new Promise<never>((_resolve, reject) => {
                request.signal?.addEventListener('abort', () => reject(request.signal?.reason), { once: true });
            }),
        }),
    });

    const error = await client.get('jwks').catch((e: unknown) => e);

    expect(isClientErrorDueTimeout(error)).toBe(true);

    return error;
}

describe('toVerificationError', () => {
    it('maps an expired token onto expired_token', () => {
        const output = toVerificationError(new VouchlyError(VouchlyErrorCode.TOKEN_EXPIRED));

        expect(output).toBeInstanceOf(JWTError);
        expect(output).toMatchObject({ code: ErrorCode.JWT_EXPIRED });
    });

    it('maps an inactive token onto inactive_token', () => {
        const output = toVerificationError(new VouchlyError(VouchlyErrorCode.TOKEN_INACTIVE));

        expect(output).toBeInstanceOf(JWTError);
        expect(output).toMatchObject({ code: ErrorCode.JWT_INACTIVE });
    });

    it.each(Object.values(VouchlyErrorCode).filter((code) => code !== VouchlyErrorCode.TOKEN_EXPIRED &&
        code !== VouchlyErrorCode.TOKEN_INACTIVE &&
        code !== VouchlyErrorCode.TIMEOUT &&
        code !== VouchlyErrorCode.INTROSPECTION_FAILED))('maps %s onto invalid_token with the vouchly message', (code) => {
        const output = toVerificationError(new VouchlyError(code, `message of ${code}`));

        expect(output).toBeInstanceOf(JWTError);
        expect(isVouchlyError(output)).toBe(false);
        expect(output).toMatchObject({ code: ErrorCode.JWT_INVALID, message: `message of ${code}` });
    });

    it('unwraps a JWTError a key source raised', () => {
        const cause = JWTError.headerPropertyInvalid('kid');
        const output = toVerificationError(new VouchlyError(VouchlyErrorCode.KEY_UNAVAILABLE, 'unavailable', { cause }));

        expect(output).toBe(cause);
    });

    it('passes a JWTError through', () => {
        const input = JWTError.expired();

        expect(toVerificationError(input)).toBe(input);
    });

    it('maps a foreign error onto invalid_token', () => {
        const output = toVerificationError(new TypeError('boom'));

        expect(isJWTError(output)).toBe(true);
        expect(output).toMatchObject({ code: ErrorCode.JWT_INVALID });
    });

    it('maps a thrown non-error onto invalid_token', () => {
        const output = toVerificationError('boom');

        expect(isJWTError(output)).toBe(true);
        expect(output).toMatchObject({ code: ErrorCode.JWT_INVALID });
    });

    it('maps a vouchly timeout onto an upstream timeout, not a JWTError', () => {
        const input = new VouchlyError(VouchlyErrorCode.TIMEOUT, 'timed out');
        const output = toVerificationError(input);

        expect(isUpstreamTimeoutError(output)).toBe(true);
        expect(isJWTError(output)).toBe(false);
        expect(output).toMatchObject({ cause: input });
    });

    it('maps a client timeout wrapped by the key loader onto an upstream timeout, before the upstream error', async () => {
        const timeout = await createClientTimeoutError();
        const wrapped = new UpstreamError({ message: 'Failed to fetch JWK from auth server.', cause: timeout });
        const input = new VouchlyError(VouchlyErrorCode.KEY_UNAVAILABLE, 'unavailable', { cause: wrapped });

        const output = toVerificationError(input);

        expect(isUpstreamTimeoutError(output)).toBe(true);
        expect(isUpstreamError(output)).toBe(false);
        expect(isJWTError(output)).toBe(false);
    });

    it('surfaces an upstream error the key loader raised as is', () => {
        const wrapped = new UpstreamError({ message: 'Failed to fetch JWK from auth server.', cause: new Error('refused') });
        const input = new VouchlyError(VouchlyErrorCode.KEY_UNAVAILABLE, 'unavailable', { cause: wrapped });

        expect(toVerificationError(input)).toBe(wrapped);
    });

    it('maps an introspection request that failed onto an upstream error, not a JWTError', () => {
        const input = new VouchlyError(VouchlyErrorCode.INTROSPECTION_FAILED, 'The introspection request failed.', { cause: new TypeError('fetch failed') });
        const output = toVerificationError(input);

        expect(isUpstreamError(output)).toBe(true);
        expect(isJWTError(output)).toBe(false);
        expect(output).toMatchObject({
            code: ErrorCode.UPSTREAM_ERROR,
            message: 'The introspection request failed.',
            cause: input,
        });
    });

    it('maps a failed introspection authorization onto an upstream error', () => {
        const input = new VouchlyError(VouchlyErrorCode.INTROSPECTION_FAILED, 'The introspection authorization could not be resolved.', { cause: new Error('invalid_client') });

        expect(isUpstreamError(toVerificationError(input))).toBe(true);
    });

    it.each([401, 403, 404, 500, 502, 503])('maps an introspection answered %s onto an upstream error', (status) => {
        const input = new VouchlyError(VouchlyErrorCode.INTROSPECTION_FAILED, `The introspection endpoint answered ${status}.`, { status });
        const output = toVerificationError(input);

        expect(isUpstreamError(output)).toBe(true);
        expect(isJWTError(output)).toBe(false);
        expect(output).toMatchObject({ cause: input });
    });

    it('maps an introspection answered 400 onto invalid_token, since the request carries nothing but the token', () => {
        const input = new VouchlyError(VouchlyErrorCode.INTROSPECTION_FAILED, 'The introspection endpoint answered 400.', { status: 400 });
        const output = toVerificationError(input);

        expect(isJWTError(output)).toBe(true);
        expect(isUpstreamError(output)).toBe(false);
        expect(output).toMatchObject({ code: ErrorCode.JWT_INVALID, cause: input });
    });

    it('passes the reason of an aborted caller signal on as is', () => {
        const reason = new Error('gone');
        const controller = new AbortController();

        controller.abort(reason);

        expect(toVerificationError(reason, controller.signal)).toBe(reason);
    });

    it('passes a caller abort on as is, even when its reason is a timeout', () => {
        const signal = AbortSignal.abort(new VouchlyError(VouchlyErrorCode.TIMEOUT));

        expect(toVerificationError(signal.reason, signal)).toBe(signal.reason);
    });

    it('does not pass on an error that is not the reason of the signal', () => {
        const controller = new AbortController();

        controller.abort(new Error('gone'));

        expect(isJWTError(toVerificationError(new Error('other'), controller.signal))).toBe(true);
    });
});
