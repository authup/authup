/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { RedisOptions } from 'ioredis';

export const TEST_REDIS_KEY_PREFIX = 'authup-test:';

/**
 * Connection options for TEST_REDIS_URL under a key prefix of this worker,
 * of `name` when given, and of this call, or `false` when the run does not
 * opt into Redis (#3688).
 *
 * Every call gets its own prefix, as every application gets its own memory
 * cache: an entry outliving its application would be served to the next spec
 * file of the worker, after writers that never bump it (provisioning.spec.ts
 * writes the shared worker database through a memory cache).
 */
export function buildTestRedisOptions(name?: string) : RedisOptions | false {
    if (!process.env.TEST_REDIS_URL) {
        return false;
    }

    const url = new URL(process.env.TEST_REDIS_URL);
    const segments = [process.env.VITEST_POOL_ID || '0'];

    if (name) {
        segments.push(name);
    }

    segments.push(randomUUID());

    const options : RedisOptions = {
        host: url.hostname,
        port: Number(url.port || 6379),
        keyPrefix: `${TEST_REDIS_KEY_PREFIX}${segments.join(':')}:`,
    };

    const db = Number(url.pathname.slice(1));

    if (Number.isSafeInteger(db) && db > 0) {
        options.db = db;
    }

    if (url.username) {
        options.username = decodeURIComponent(url.username);
    }

    if (url.password) {
        options.password = decodeURIComponent(url.password);
    }

    // ioredis derives TLS from a rediss url, never from options rebuilt from it.
    if (url.protocol === 'rediss:') {
        options.tls = {};
    }

    return options;
}
