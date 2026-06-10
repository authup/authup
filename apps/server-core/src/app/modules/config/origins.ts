/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'node:url';
import type { Config } from './types.ts';

/**
 * Derive the set of trusted application origins (scheme://host[:port]).
 *
 * publicUrl may carry a path; both the OAuth2 redirect allowlist and the
 * CORS origin allowlist need bare origins, so extract the origin from each
 * configured URL and de-duplicate.
 */
export function getAppOrigins(config: Pick<Config, 'publicUrl' | 'additionalDomains'>): string[] {
    const urls = [config.publicUrl, ...(config.additionalDomains ?? [])];

    const origins = new Set<string>();
    for (const url of urls) {
        origins.add(new URL(url).origin);
    }

    return Array.from(origins);
}
