/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LOOPBACK_HOSTNAMES } from './constants.ts';

export function normalizeHostURL(input: string) : string {
    let url : URL;
    try {
        url = new URL(input);
    } catch {
        throw new Error(`"${input}" is not a URL.`);
    }

    if (url.username || url.password || url.search || url.hash) {
        throw new Error(`The server URL must carry no user name, password, query or fragment: ${input}`);
    }

    const loopback = url.protocol === 'http:' && LOOPBACK_HOSTNAMES.includes(url.hostname);
    if (!loopback && url.protocol !== 'https:') {
        throw new Error(`Use https for ${url.host}: the CLI sends its tokens to this address, and plain http is accepted for loopback only.`);
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
