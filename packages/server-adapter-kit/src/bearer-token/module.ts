/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BearerTokenMalformedError } from '@authup/errors';

export function extractBearerToken(authorization: string | undefined): string | undefined {
    if (typeof authorization !== 'string') {
        return undefined;
    }

    const spaceIndex = authorization.indexOf(' ');
    if (spaceIndex === -1) {
        throw new BearerTokenMalformedError();
    }

    const scheme = authorization.substring(0, spaceIndex);
    if (scheme !== 'Bearer') {
        throw new BearerTokenMalformedError(
            'Only Bearer tokens are accepted as authentication method.',
        );
    }

    const token = authorization.substring(spaceIndex + 1);
    if (token.length === 0) {
        throw new BearerTokenMalformedError('The bearer token value is empty.');
    }

    return token;
}
