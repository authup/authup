/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function makeURLPublicAccessible(url: string) {
    return url.replace('0.0.0.0', '127.0.0.1');
}

/**
 * Resolve a relative `path` against a `base` URL **without dropping the base's
 * final path segment**.
 *
 * The `URL` constructor treats the last segment of the base as a document and
 * replaces it when the base has no trailing slash, so
 * `new URL('authorize', 'https://acme.tld/api')` yields
 * `https://acme.tld/authorize` — the `/api` sub-path is silently lost.
 * Normalizing the base to a trailing slash (and stripping any leading slash off
 * `path`, which would otherwise reset to the origin root) preserves the
 * sub-path: `https://acme.tld/api/authorize`.
 *
 * A `URL` is returned so callers can mutate `searchParams` before reading
 * `href`. An absent/invalid `base` throws, matching `new URL` semantics.
 */
export function buildURL(base: string | undefined, path: string): URL {
    const normalizedBase = base && !base.endsWith('/') ?
        `${base}/` :
        base;

    return new URL(path.replace(/^\/+/, ''), normalizedBase);
}

export function getURLBasePath(url?: string) : string {
    if (!url) {
        return '';
    }

    let pathname : string;
    try {
        pathname = new URL(url).pathname;
    } catch {
        return '';
    }

    const normalized = pathname
        .replace(/\/+$/, '')
        .replace(/^\/{2,}/, '/');
    if (normalized === '' || normalized === '/') {
        return '';
    }

    return normalized;
}
