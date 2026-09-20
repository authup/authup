/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
    HOSTS_LOCK_FILE_NAME,
    HOSTS_LOCK_POLL_MS,
    HOSTS_LOCK_STALE_MS,
    HOSTS_LOCK_WAIT_MS,
} from './constants.ts';

async function acquire(file: string) : Promise<FileHandle> {
    const deadline = Date.now() + HOSTS_LOCK_WAIT_MS;

    for (;;) {
        try {
            return await fs.open(file, 'wx', 0o600);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw e;
            }
        }

        const stat = await fs.stat(file).catch(() => undefined);
        if (stat && Date.now() - stat.mtimeMs > HOSTS_LOCK_STALE_MS) {
            await fs.rm(file, { force: true });
            continue;
        }

        if (Date.now() >= deadline) {
            throw new Error(`Another authup command holds ${file}. Retry once it has finished.`);
        }

        await setTimeout(HOSTS_LOCK_POLL_MS);
    }
}

/**
 * Two CLI processes refreshing at once would present one refresh token
 * twice, and strict rotation answers the replay by revoking the family.
 * The lock wraps a rotation and a write of the hosts file, never a whole
 * command; a lock older than the stale cut belongs to a process that died.
 */
export async function withHostLock<T>(directory: string, fn: () => Promise<T>) : Promise<T> {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });

    const file = path.join(directory, HOSTS_LOCK_FILE_NAME);
    const handle = await acquire(file);

    try {
        return await fn();
    } finally {
        await handle.close();
        await fs.rm(file, { force: true });
    }
}
