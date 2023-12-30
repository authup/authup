/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from '@authup/config';
import type { Config } from '@authup/server-core-app';
import { buildConfig, parseConfig } from '@authup/server-core-app';

export async function buildServerCoreConfig(input?: Container): Promise<Config> {
    let container : Container;
    if (input) {
        container = input;
    } else {
        container = new Container();
        await container.load();
    }

    const data = parseConfig(container.get({
        group: 'server',
        id: 'core',
    }));

    return buildConfig({
        data,
        env: true,
    });
}
