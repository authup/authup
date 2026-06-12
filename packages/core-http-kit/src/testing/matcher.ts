/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FakeHandler, FakeHandlerMap } from './types';

export type RouteMatch = {
    handler: FakeHandler,
    params: Record<string, string>,
};

function matchPath(pattern: string, path: string) : Record<string, string> | null {
    const patternSegments = pattern.split('/').filter(Boolean);
    const pathSegments = path.split('/').filter(Boolean);
    if (patternSegments.length !== pathSegments.length) {
        return null;
    }

    const params : Record<string, string> = {};
    for (const [i, patternSegment] of patternSegments.entries()) {
        if (patternSegment.startsWith(':')) {
            params[patternSegment.slice(1)] = pathSegments[i];
        } else if (patternSegment !== pathSegments[i]) {
            return null;
        }
    }

    return params;
}

export function matchRoute(
    method: string,
    url: string,
    handlers: FakeHandlerMap,
) : RouteMatch | null {
    const path = new URL(url, 'http://localhost').pathname;

    let catchAll : RouteMatch | null = null;

    const keys = Object.keys(handlers);
    for (const key of keys) {
        if (key === '*') {
            catchAll = { handler: handlers[key], params: {} };
            continue;
        }

        const separatorIndex = key.indexOf(' ');
        if (separatorIndex === -1) {
            continue;
        }

        if (key.slice(0, separatorIndex).toUpperCase() !== method) {
            continue;
        }

        const params = matchPath(key.slice(separatorIndex + 1), path);
        if (params) {
            return { handler: handlers[key], params };
        }
    }

    return catchAll;
}
