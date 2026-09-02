/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Handler, IAppEvent } from 'routup';
import { defineCoreHandler } from 'routup';

/**
 * The one path a console dev server must never answer.
 *
 * Vite registers `middlewares.use('/__open-in-editor', launchEditorMiddleware())`
 * UNCONDITIONALLY (vite 8.2.1), and that middleware spawns a child process:
 * `launch-editor` runs `process.env.LAUNCH_EDITOR` (or a guessed editor) with
 * a caller-chosen path. It is a side-effecting endpoint reachable by a plain
 * GET, so any page a developer visits can fire it cross-origin with
 * `<img src="http://localhost:3000/console/admin/__open-in-editor?file=...">`.
 * Vite's own host allowlist does not defend it: that check sees
 * `Host: localhost`, which is exactly what such a request carries.
 *
 * The refusal sits in FRONT of `fromNodeMiddleware` rather than reaching into
 * vite's middleware stack, so it survives a vite upgrade reordering or
 * renaming its internals.
 *
 * The comparison must be case-insensitive. Connect's own dispatch (vite
 * 8.2.1, `node_modules/vite/dist/node/chunks/node.js:7038`) matches a route
 * with `path.toLowerCase().substr(0, route.length) !== route.toLowerCase()`,
 * so `/__OPEN-IN-EDITOR` reaches the middleware exactly as `/__open-in-editor`
 * does. A literal segment comparison here would refuse the spelling connect
 * matches loosely while letting every other casing walk straight past it.
 */
export function createOpenInEditorGuard() : Handler {
    return defineCoreHandler((event: IAppEvent) => {
        const segments = event.path.split('/').map((segment) => segment.toLowerCase());

        if (segments.includes('__open-in-editor')) {
            event.response.status = 404;

            return null;
        }

        return event.next();
    });
}
