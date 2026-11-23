/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientError, extendError } from 'hapic';

export const PATH_SEGMENT_INVALID_ERROR_CODE = 'path_segment_invalid';

/**
 * Turn an id or name into one path segment. An empty value, `.` and `..`
 * are refused before any request is sent (the URL parser would fold a dot
 * segment into another path); everything else is percent-encoded, so `/`,
 * `?` and `#` cannot add segments or a query. `@` stays literal: it is a
 * valid path character and the `@me` / `@self` aliases are matched as such.
 *
 * @throws ClientError with code `path_segment_invalid`
 */
export function encodePathSegment(input: string | number) : string {
    const value = `${input}`;

    if (value === '' || value === '.' || value === '..') {
        const error = new ClientError({
            message: `The path segment "${value}" is not valid.`,
            request: { url: value },
        });

        extendError(error, { code: PATH_SEGMENT_INVALID_ERROR_CODE });

        throw error;
    }

    return encodeURIComponent(value).replace(/%40/g, '@');
}
