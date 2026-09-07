/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Container } from 'eldin';
import { App } from 'routup';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Logger } from '@authup/server-kit';
import { createNoopLogger } from '@authup/server-kit';
import type { Config } from '../../../../src/index.ts';
import { ConfigInjectionKey, LoggerInjectionKey } from '../../../../src/app/index.ts';
import { HTTPMiddlewareModule } from '../../../../src/app/modules/http/modules/middleware.ts';
import { createSwaggerMiddleware } from '../../../../src/adapters/http/middleware/built-in/swagger.ts';

const SCHEMA_HASH = 'a'.repeat(64);

const DOCUMENT = {
    openapi: '3.0.0',
    info: { title: 'authup', version: '0.0.0' },
    paths: {},
    'x-authup-schema-hash': SCHEMA_HASH,
};

function createRecordingLogger() {
    const warnings : string[] = [];
    const logger = createNoopLogger();
    logger.warn = ((message: unknown) => {
        warnings.push(String(message));

        return logger;
    }) as Logger['warn'];

    return { logger, warnings };
}

function createRouter(documentPath: string, schemaHash?: string, logger?: Logger) : App {
    const app = new App();
    const middleware = createSwaggerMiddleware({
        documentPath,
        schemaHash,
        logger,
        baseURL: 'http://localhost:3000',
    });

    if (middleware) {
        app.use('/docs', middleware);
    }

    return app;
}

describe('swagger middleware', () => {
    let directory : string;
    let documentPath : string;

    beforeAll(async () => {
        directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-swagger-'));
        documentPath = path.join(directory, 'swagger.json');

        await fs.promises.writeFile(documentPath, JSON.stringify(DOCUMENT), 'utf-8');
    });

    afterAll(async () => {
        await fs.promises.rm(directory, { recursive: true, force: true });
    });

    describe('raw document', () => {
        it('serves the document as json', async () => {
            const app = createRouter(documentPath);

            const response = await app.fetch(new Request('http://localhost/docs/openapi.json'));

            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toMatch(/^application\/json/);
            expect(await response.json()).toEqual(DOCUMENT);
        });

        // The handler sets no ETag of its own: routup derives one from the
        // body and overwrites whatever a handler set, so a hand-rolled one
        // would only be a second hash of the same bytes.
        it('answers a conditional request from the response etag', async () => {
            const app = createRouter(documentPath);

            const response = await app.fetch(new Request('http://localhost/docs/openapi.json'));
            const etag = response.headers.get('etag');

            expect(etag).toBeTruthy();

            const conditional = await app.fetch(new Request('http://localhost/docs/openapi.json', { headers: { 'if-none-match': etag as string } }));

            expect(conditional.status).toEqual(304);
        });

        // The UI plugin answers every unmatched path under its mount with the
        // HTML shell, so the raw route only exists while it is registered
        // ahead of it.
        it('is not shadowed by the ui shell', async () => {
            const app = createRouter(documentPath);

            const response = await app.fetch(new Request('http://localhost/docs'));

            expect(response.status).toEqual(200);
            expect(response.headers.get('content-type')).toMatch(/^text\/html/);
        });
    });

    describe('staleness', () => {
        it('warns when the document was built for another query vocabulary', () => {
            const { logger, warnings } = createRecordingLogger();

            createRouter(documentPath, 'b'.repeat(64), logger);

            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain(SCHEMA_HASH);
            expect(warnings[0]).toContain('b'.repeat(64));
        });

        it('stays silent when the fingerprints agree', () => {
            const { logger, warnings } = createRecordingLogger();

            createRouter(documentPath, SCHEMA_HASH, logger);

            expect(warnings).toHaveLength(0);
        });
    });

    describe('missing document', () => {
        // @routup/swagger-ui reads the file synchronously inside its own
        // install, so this used to abort the boot of the whole API.
        it('does not throw', () => {
            const { logger, warnings } = createRecordingLogger();
            const missing = path.join(directory, 'absent.json');

            expect(() => createSwaggerMiddleware({ documentPath: missing, logger })).not.toThrow();
            expect(createSwaggerMiddleware({ documentPath: missing, logger })).toBeUndefined();
            expect(warnings[0]).toContain(missing);
        });

        it('serves nothing', async () => {
            const app = createRouter(path.join(directory, 'absent.json'));

            const response = await app.fetch(new Request('http://localhost/docs/openapi.json'));

            expect(response.status).toEqual(404);
        });
    });

    describe('gate', () => {
        async function mount(middlewareSwagger: boolean) : Promise<App> {
            const container = new Container();
            container.register(ConfigInjectionKey, {
                useValue: {
                    middlewareSwagger,
                    publicUrl: 'http://localhost:3000',
                } as Config,
            });
            container.register(LoggerInjectionKey, { useValue: createNoopLogger() });

            const app = new App();
            await new HTTPMiddlewareModule().mountSwagger(app, container);

            return app;
        }

        it('serves nothing when disabled', async () => {
            const app = await mount(false);

            const response = await app.fetch(new Request('http://localhost/docs/openapi.json'));

            expect(response.status).toEqual(404);
        });

        // The mounted document is the built one, which need not exist in a
        // checkout that has not run the swagger build step.
        it('boots when enabled', async () => {
            await expect(mount(true)).resolves.toBeDefined();
        });
    });
});
