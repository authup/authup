/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { basic } from '@routup/basic';
import type { IAppEvent } from 'routup';
import { App, defineCoreHandler } from 'routup';
import { serve } from 'routup/node';

/**
 * A real routup event for the request path given. The dev helpers read
 * request state through `@routup/basic`, so a hand-built object would not
 * answer the way one from a served request does.
 */
export async function captureEvent(requestPath = '/') : Promise<IAppEvent> {
    let captured : IAppEvent | undefined;

    const app = new App();
    app.use(basic({ cookie: true, query: true }));

    const handler = (event: IAppEvent) => {
        captured = event;

        return 'ok';
    };

    app.use(defineCoreHandler({
        method: 'get',
        path: '',
        fn: handler,
    }));
    app.use(defineCoreHandler({
        method: 'get',
        path: '/*page',
        fn: handler,
    }));

    const server = serve(app, { port: 0, silent: true });
    await server.ready();

    try {
        await fetch(`${(server.url ?? '').replace(/\/+$/, '')}${requestPath}`);
    } finally {
        await server.close(true);
    }

    if (!captured) {
        throw new Error(`no event captured for ${requestPath}`);
    }

    return captured;
}
