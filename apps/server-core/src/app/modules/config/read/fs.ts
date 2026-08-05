/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { FSStore } from 'confinity';
import { isObject, merge } from 'smob';
import type { ConfigInput } from '../types.ts';
import type { ConfigReadFsOptions } from './types.ts';

/**
 * Resolve one infrastructure section (`db`, `redis`, `smtp`), which may be
 * declared at the top level (shared), under `server.*` or under `server.core.*`.
 *
 * Keys are ordered **least specific first**. Two objects are merged, so a
 * shared base survives while the more specific declaration wins per key; a
 * scalar (a `redis://…` connection string, say) replaces whatever preceded it.
 * That is what "the most specific declaration wins" means for a section the
 * documentation explicitly describes as shared — `db.type` set once at the top
 * level still applies when only `db.database` is overridden per component.
 *
 * confinity v1 applied exactly this precedence inside `get([...keys])`; v2
 * removed the array form, so it is spelled out here instead.
 */
function readSection<T>(store: FSStore, keys: string[]) : T | undefined {
    let output : unknown;

    for (const key of keys) {
        const value = store.getSync(key);
        if (typeof value === 'undefined') {
            continue;
        }

        output = isObject(value) && isObject(output) ?
            merge(value, output) :
            value;
    }

    return output as T | undefined;
}

export async function readConfigRawFromFS(options: ConfigReadFsOptions = {}) {
    const store = new FSStore({
        prefix: 'authup',
        cwd: options.cwd,
    });

    if (options.file) {
        await store.loadFile(options.file);
    } else {
        await store.load();
    }

    // Read synchronously after the explicit load. `get` is asynchronous in
    // confinity v2, and a missing `await` would hand a Promise to code that
    // only checks whether it received an object.
    const raw : ConfigInput = store.getSync<ConfigInput>('server.core') || {};

    const db = readSection<ConfigInput['db']>(store, [
        'db',
        'server.db',
        'server.core.db',
    ]);
    if (db) {
        raw.db = db;
    }

    const redis = readSection<ConfigInput['redis']>(store, [
        'redis',
        'server.redis',
        'server.core.redis',
    ]);
    if (redis) {
        raw.redis = redis;
    }

    const smtp = readSection<ConfigInput['smtp']>(store, [
        'smtp',
        'server.smtp',
        'server.core.smtp',
    ]);
    if (smtp) {
        raw.smtp = smtp;
    }

    return raw;
}
