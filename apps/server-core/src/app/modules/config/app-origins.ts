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
 * publicUrl may carry a path, so its origin is extracted; trustedOrigins
 * entries are canonical origins already (normalizeConfig owns that
 * invariant, via `expandToOrigins`) and are merged verbatim.
 */
export function getAppOrigins(config: Pick<Config, 'publicUrl' | 'trustedOrigins'>): string[] {
    const origins = new Set<string>();
    origins.add(new URL(config.publicUrl).origin);

    for (const origin of config.trustedOrigins ?? []) {
        origins.add(origin);
    }

    return Array.from(origins);
}
