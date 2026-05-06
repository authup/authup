/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Resolve a relative path against a base URL while preserving the base's path
 * component. The native `new URL(relative, base)` treats a base without a
 * trailing slash as a file, so `new URL('token', 'https://example.com/api')`
 * collapses to `https://example.com/token` — wrong for deployments mounted
 * under a path prefix. This helper guarantees the prefix is preserved by
 * appending a trailing slash to the base when it is missing.
 */
export function resolveURL(base: string, relative: string): string {
    const normalized = base.endsWith('/') ? base : `${base}/`;
    const stripped = relative.startsWith('/') ? relative.slice(1) : relative;
    return new URL(stripped, normalized).href;
}
