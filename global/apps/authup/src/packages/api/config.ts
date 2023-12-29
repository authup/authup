/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigRaw } from '@authup/config';
import { read } from '@authup/config';
import type { Config } from '@authup/server-core-app';
import { createConfig, parseConfig } from '@authup/server-core-app';

export async function buildServerCoreConfig(input?: ConfigRaw): Promise<Config> {
    let raw : ConfigRaw;
    if (input) {
        raw = input;
    } else {
        raw = await read();
    }

    const data = parseConfig(raw.server.core || {});
    // todo: createConfig -> buildConfig + env context option
    return createConfig(data);
}
