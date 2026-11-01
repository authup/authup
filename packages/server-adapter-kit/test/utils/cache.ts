/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ITokenCache } from 'vouchly';
import { hashToken } from 'vouchly';

/**
 * The claims a verifier cached for a token, read under the namespace the
 * verifier derives for a cache passed in: `authup:<mode>:<baseURL>`.
 */
export async function readCachedClaims(
    cache: ITokenCache,
    token: string,
    namespace: string,
) : Promise<Record<string, any> | undefined> {
    const entry = await cache.get(await hashToken(`${namespace}\0${token}`));

    return entry?.claims;
}
