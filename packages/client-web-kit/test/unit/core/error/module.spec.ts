/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { extractErrorContext } from '../../../../src/core/error';

describe('extractErrorContext', () => {
    describe('non-object input', () => {
        it('wraps a string error as the message, with no status', () => {
            expect(extractErrorContext('boom')).toEqual({ message: 'boom' });
        });

        it('returns an empty context for a nullish/primitive error', () => {
            expect(extractErrorContext(undefined)).toEqual({ message: undefined });
            expect(extractErrorContext(null)).toEqual({ message: undefined });
            expect(extractErrorContext(42)).toEqual({ message: undefined });
        });
    });

    describe('HTTP transport error (hapic ClientError shape)', () => {
        it('extracts status, code, data and message from response.data', () => {
            const error = {
                message: 'Request failed',
                response: {
                    status: 401,
                    data: {
                        code: 'unauthorized',
                        message: 'Bearer expired',
                        error: 'login_required',
                        issues: [],
                    },
                },
            };

            const ctx = extractErrorContext(error);

            expect(ctx.status).toBe(401);
            expect(ctx.code).toBe('unauthorized');
            // the server-side body message wins over the transport's own message
            expect(ctx.message).toBe('Bearer expired');
            expect(ctx.data).toMatchObject({ error: 'login_required' });
            // an empty issues array is treated as "no issues"
            expect(ctx.issues).toBeUndefined();
        });

        it('keeps a non-empty issues array', () => {
            const issues = [{ path: 'name', message: 'is required' }];
            const error = {
                response: {
                    status: 400,
                    data: { code: 'bad_request', issues },
                },
            };

            expect(extractErrorContext(error).issues).toEqual(issues);
        });

        it('falls back to the transport message when the body object has none', () => {
            // response.data is a real object, but it carries no `message`; the
            // resolved message must fall through to the transport error's own.
            const error = {
                message: 'Request failed',
                response: {
                    status: 403,
                    data: { code: 'permission_denied' },
                },
            };

            const ctx = extractErrorContext(error);

            expect(ctx.status).toBe(403);
            expect(ctx.code).toBe('permission_denied');
            expect(ctx.message).toBe('Request failed');
        });

        it('reads status even when response.data is not an object (falls back to self as body)', () => {
            const error = {
                message: 'Request failed',
                response: {
                    status: 500,
                    data: undefined,
                },
            };

            const ctx = extractErrorContext(error);

            expect(ctx.status).toBe(500);
            // no usable body on response.data, so self is used as the body —
            // self.message becomes the resolved message.
            expect(ctx.message).toBe('Request failed');
            expect(ctx.code).toBeUndefined();
        });

        it('leaves status undefined when response.status is not a number', () => {
            const error = {
                response: {
                    status: '401',
                    data: { code: 'unauthorized' },
                },
            };

            expect(extractErrorContext(error).status).toBeUndefined();
        });

        it('leaves status undefined when there is no response at all', () => {
            const error = { message: 'network down' };

            const ctx = extractErrorContext(error);

            expect(ctx.status).toBeUndefined();
            expect(ctx.message).toBe('network down');
        });

        it('leaves status undefined when response is not an object', () => {
            const error = { response: 'not-an-object', message: 'weird' };

            const ctx = extractErrorContext(error);

            expect(ctx.status).toBeUndefined();
            expect(ctx.message).toBe('weird');
        });
    });

    describe('directly-thrown error (no transport envelope)', () => {
        it('reads code/data/message/issues off the error itself, with no status', () => {
            const error = {
                code: 'entity_conflict',
                message: 'Already exists',
                issues: [{ path: 'email', message: 'taken' }],
            };

            const ctx = extractErrorContext(error);

            expect(ctx.status).toBeUndefined();
            expect(ctx.code).toBe('entity_conflict');
            expect(ctx.message).toBe('Already exists');
            expect(ctx.issues).toEqual(error.issues);
            expect(ctx.data).toBe(error);
        });

        it('ignores a non-string code', () => {
            const error = { code: 42, message: 'oops' };

            expect(extractErrorContext(error).code).toBeUndefined();
        });
    });
});
