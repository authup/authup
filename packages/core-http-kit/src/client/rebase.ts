/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { FetchTransport } from 'hapic';
import type { ITransport } from 'hapic';

function trimTrailingSlashes(input: string) : string {
    return input.replace(/\/+$/, '');
}

function isSegmentBoundary(char: string) : boolean {
    return char === '' || char === '/' || char === '?' || char === '#';
}

/**
 * Build a function that moves a url from under one base onto another.
 *
 * A url outside `from` (a foreign origin, a sibling path such as `/authz`
 * against `/auth`, a relative input) is returned unchanged. A configured
 * path on `to` is kept, so an internal proxy that strips a prefix keeps
 * working.
 *
 * The match is on strings rather than on parsed urls, because a client
 * produces exactly two forms: hapic joins the raw base string with the
 * request path, and the absolute OAuth2 endpoints are WHATWG serializations
 * of the base. Only those two spellings are recognised; a url naming the same
 * origin another way (an explicit default port, other host case) is left as
 * it is and dialed at that address. Parsing the request url instead would
 * resolve dot segments (an unencoded `../` in an id) BEFORE the match and
 * could leave the prefix, sending the request to the public address; matched
 * first, they resolve against `to` exactly as they would on a client based
 * on it. Concatenating onto `to` instead of resolving relative to it also
 * means a remainder starting with `//` can never move the authority.
 */
export function createBaseURLRewriter(from: string, to: string) : (url: string) => string {
    const target = trimTrailingSlashes(to);
    const prefixes = [trimTrailingSlashes(from)];

    if (prefixes[0] === target) {
        return (url) => url;
    }

    try {
        const parsed = new URL(from);

        parsed.search = '';
        parsed.hash = '';

        const normalized = trimTrailingSlashes(parsed.href);

        if (normalized !== prefixes[0]) {
            prefixes.push(normalized);
        }
    } catch {
        // an unparsable base is matched by its raw form alone
    }

    return (url) => {
        for (const prefix of prefixes) {
            if (
                url.startsWith(prefix) &&
                isSegmentBoundary(url.charAt(prefix.length))
            ) {
                const output = target + url.slice(prefix.length);

                try {
                    return new URL(output).href;
                } catch {
                    return output;
                }
            }
        }

        return url;
    };
}

/**
 * A transport that dispatches every request under `from` against `to`.
 *
 * It lets a client keep its PUBLIC base url while it is dialed through an
 * internal address: everything derived from the base url (the identity
 * provider authorize url, the absolute OAuth2 endpoints, hapic's error
 * message) is user-facing, so only the dispatch may move. The rewrite never
 * writes back into the request options, so a retried request is rewritten
 * exactly once per dispatch.
 */
export function createRebasedTransport(
    from: string,
    to: string,
    transport: ITransport = new FetchTransport(),
) : ITransport {
    const rewrite = createBaseURLRewriter(from, to);

    return { dispatch: (request) => transport.dispatch({ ...request, url: rewrite(request.url) }) };
}
