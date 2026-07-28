/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalizeConfig } from './normalize.ts';
import type { ConfigRawReadOptions } from './read/index.ts';
import { readConfigRaw } from './read/index.ts';
import type { Config } from './types.ts';

/**
 * Read config from env (and optionally fs) and normalize it.
 *
 * @param options
 */
export async function readConfig(options: ConfigRawReadOptions = {}) : Promise<Config> {
    const raw = await readConfigRaw({
        env: true,
        ...options,
    });

    return normalizeConfig(raw);
}
