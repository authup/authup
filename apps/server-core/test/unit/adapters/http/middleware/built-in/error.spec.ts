/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { 
    beforeEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { App, defineCoreHandler } from 'routup';
import { ErrorCode } from '@authup/errors';
import { NotFoundError } from '@ebec/http';
import type { Response as HapicResponse, RequestOptions } from 'hapic';
import { createClientError } from 'hapic';
import type { Logger } from '@authup/server-kit';
import { createNoopLogger } from '@authup/server-kit';
import { registerErrorMiddleware } from '../../../../../../src/adapters/http/middleware/built-in/error.ts';

const UPSTREAM_URL = 'https://upstream.test/token';

/**
 * A logger recording what the middleware writes — the recorded text is
 * the artifact under test, and winston's transports would swallow it.
 */
function createRecordingLogger() {
    const lines: string[] = [];
    const logger = createNoopLogger();

    logger.error = ((message: unknown) => {
        lines.push(typeof message === 'string' ? message : String(message));
        return logger;
    }) as Logger['error'];

    return { logger, lines };
}

function createUpstreamResponseError(body: unknown, status = 400) {
    const request: RequestOptions = { method: 'POST', url: UPSTREAM_URL };
    const response = new Response(null, { status, statusText: 'Bad Request' }) as HapicResponse;
    Object.defineProperty(response, 'data', { get: () => body });

    return createClientError({ request, response });
}

describe('registerErrorMiddleware', () => {
    let recorder: ReturnType<typeof createRecordingLogger>;

    function dispatch(error: unknown) {
        const app = new App();
        app.get('/failing', defineCoreHandler(() => {
            throw error;
        }));
        registerErrorMiddleware(app, { logger: recorder.logger });

        return app.fetch(new Request('http://server.test/failing'));
    }

    beforeEach(() => {
        recorder = createRecordingLogger();
    });

    it('should answer an upstream failure with a bad gateway', async () => {
        const response = await dispatch(createUpstreamResponseError({ error: 'invalid_request' }));

        expect(response.status).toEqual(502);
        await expect(response.json()).resolves.toMatchObject({ code: ErrorCode.UPSTREAM_ERROR });
    });

    it('should log the upstream status and body of a failed outbound call', async () => {
        await dispatch(createUpstreamResponseError({
            error: 'invalid_request',
            error_description: 'redirect_uri mismatch',
        }));

        expect(recorder.lines.join('\n')).toContain('upstream status: 400');
        expect(recorder.lines.join('\n')).toContain('redirect_uri mismatch');
    });

    it('should not expose the upstream url to the caller', async () => {
        const response = await dispatch(createUpstreamResponseError({ error: 'invalid_request' }));

        await expect(response.text()).resolves.not.toContain(UPSTREAM_URL);
    });

    it('should keep answering a framework http error with its own status', async () => {
        const response = await dispatch(new NotFoundError());

        expect(response.status).toEqual(404);
        expect(recorder.lines).toHaveLength(0);
    });
});
