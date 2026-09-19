/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function normalizeServer(input: string) : string {
    const url = new URL(input);
    if (url.username || url.password || url.search || url.hash) {
        throw new Error('The server URL must not contain credentials, a query or a fragment.');
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
        throw new Error('Use HTTPS for remote servers (HTTP is allowed for loopback only).');
    }
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
    return url.href;
}

export function resolveAPIPath(server: string, input: string) : string {
    if (!input || /^[a-z][a-z\d+.-]*:/i.test(input) || input.startsWith('//') || /[\\#\s]/.test(input)) {
        throw new Error('Use an API path relative to the configured server.');
    }
    const url = new URL(input.replace(/^\//, ''), server);
    if (url.origin !== new URL(server).origin || !url.pathname.startsWith(new URL(server).pathname)) {
        throw new Error('The API path must stay within the configured server base path.');
    }
    return url.href;
}
