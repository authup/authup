/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'confinity';
import type { ConfigInput } from '../types.ts';
import type { ConfigReadFsOptions } from './types.ts';

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

    const db = container.get([
        'db',
        'server.db',
        'server.core.db',
    ]);
    if (db) {
        raw.db = db;
    }

    const redis = container.get([
        'redis',
        'server.redis',
        'server.core.redis',
    ]);
    if (redis) {
        raw.redis = redis;
    }

    const smtp = container.get([
        'smtp',
        'server.smtp',
        'server.core.smtp',
    ]);
    if (smtp) {
        raw.smtp = smtp;
    }

    const vault = container.get([
        'vault',
        'server.vault',
        'server.core.vault',
    ]);
    if (vault) {
        raw.vault = vault;
    }

    return raw;
}
