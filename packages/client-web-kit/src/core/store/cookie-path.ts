/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { COOKIE_PATH } from './constants';

/**
 * The one form a store cookie path is written, cleared and compared in: a
 * leading `/` and no trailing `/`, the form a document's default-path
 * (RFC 6265 5.1.4) and `getURLBasePath` take.
 */
export function normalizeCookiePath(input?: string) : string {
    const path = (input || '').trim().replace(/\/+$/, '');

    if (!path) {
        return COOKIE_PATH;
    }

    return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Every path other than the pinned one that a cookie could sit on and still
 * reach a document at `pathname`: each `/`-boundary prefix of it plus the
 * path itself. Root is never listed, since it belongs to whatever else is
 * served on the origin.
 */
export function buildShadowingCookiePaths(pathname: string, cookiePath: string) : string[] {
    const output : string[] = [];

    let path = '';

    for (const segment of pathname.split('/')) {
        if (!segment) {
            continue;
        }

        path += `/${segment}`;

        if (path !== cookiePath) {
            output.push(path);
        }
    }

    return output;
}
