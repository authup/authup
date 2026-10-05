/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readRequestBody } from '@routup/basic/body';
import { App, defineCoreHandler } from 'routup';
import { describe, expect, it } from 'vitest';
import {
    buildBodyOptions,
    registerBasicMiddleware,
} from '../../../../../../src/adapters/http/middleware/built-in/basic.ts';

function createApp(input: boolean | Record<string, any>) {
    const app = new App();

    registerBasicMiddleware(app, { body: buildBodyOptions(input) });
    app.post('/body', defineCoreHandler(async (event) => readRequestBody(event)));

    return app;
}

function postForm(app: App) {
    return app.fetch(new Request('http://server.test/body', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=password',
    }));
}

function postJSON(app: App, size: number) {
    return app.fetch(new Request('http://server.test/body', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'a'.repeat(size) }),
    }));
}

describe('buildBodyOptions', () => {
    it('should keep parsing forms when only the json parser is configured', async () => {
        const response = await postForm(createApp({ json: { limit: '20mb' } }));

        expect(response.status).toEqual(200);
        expect(await response.json()).toEqual({ grant_type: 'password' });
    });

    it('should honour a raised limit on the parser it names', async () => {
        const response = await postJSON(createApp({ json: { limit: '20mb' } }), 11 * 1024 * 1024);

        expect(response.status).toEqual(200);
    });

    it.each([
        true,
        {},
        { json: true },
        { json: { strict: false } },
    ])('should keep the 10mb cap for %j', async (input) => {
        const response = await postJSON(createApp(input), 11 * 1024 * 1024);

        expect(response.status).toEqual(413);
    });

    it('should turn a parser off only when it is set to false', async () => {
        const response = await postForm(createApp({ urlEncoded: false }));

        expect(await response.text()).not.toContain('grant_type');
    });

    it('should turn body parsing off entirely for false', () => {
        expect(buildBodyOptions(false)).toEqual(false);
    });
});
