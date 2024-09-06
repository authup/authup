/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'confinity';
import type { ConfigInput } from '../types';
import type { ConfigReadFsOptions } from './types';

export async function readConfigRawFromFS(options: ConfigReadFsOptions = {}) {
    const container = new Container({
        prefix: 'authup',
        cwd: options.cwd,
    });

    if (options.file) {
        await container.loadFile(options.file);
    } else {
        await container.load();
    }

    const raw : ConfigInput = container.get('server.core') || {};
    raw.db = container.get([
        'db',
        'server.db',
        'server.core.db',
    ]);
    raw.redis = container.get([
        'redis',
        'server.redis',
        'server.core.redis',
    ]);
    raw.smtp = container.get([
        'smtp',
        'server.smtp',
        'server.core.smtp',
    ]);
    raw.vault = container.get([
        'vault',
        'server.vault',
        'server.core.vault',
    ]);

    return raw;
}
