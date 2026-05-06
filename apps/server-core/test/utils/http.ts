/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TestHTTPApplication } from '../app/http.ts';

type FetchOptions = {
    /**
     * Form fields encoded as `application/x-www-form-urlencoded`. Mutually
     * exclusive with `body`. Sets the Content-Type header automatically.
     */
    form?: Record<string, string>,
    /**
     * Raw body. Caller is responsible for setting Content-Type if applicable.
     */
    body?: BodyInit,
    /**
     * Extra request headers. Merged on top of the form Content-Type default.
     */
    headers?: Record<string, string>,
};

/**
 * Raw `fetch()` against the test server, for tests that need to bypass the
 * typed `@authup/core-http-kit` client — e.g. asserting on raw HTML bodies,
 * OAuth2 redirect payloads, or RFC 6749 edge cases the typed client deletes
 * (Basic auth + body credentials, missing form fields, etc.).
 *
 * Returns the native `Response` so the caller controls status / body parsing.
 */
export async function httpRequest(
    suite: TestHTTPApplication,
    method: string,
    path: string,
    options: FetchOptions = {},
): Promise<Response> {
    const headers : Record<string, string> = { ...(options.headers ?? {}) };
    let body : BodyInit | undefined;

    if (options.form) {
        body = new URLSearchParams(options.form).toString();
        if (!Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
    } else if (typeof options.body !== 'undefined') {
        body = options.body;
    }

    const url = path.startsWith('http') ? path : `${suite.baseURL}${path.startsWith('/') ? path : `/${path}`}`;

    return fetch(url, {
        method,
        headers,
        body,
    });
}
