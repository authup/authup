/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import type { SessionStore } from './types.ts';

export function createFileStore(file: string) : SessionStore {
    return {
        async read() {
            let handle;
            try {
                handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
                throw error;
            }
            try {
                const stat = await handle.stat();
                if (!stat.isFile() || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) {
                    throw new Error('Credentials must be a private file (mode 0600).');
                }
                return await handle.readFile('utf8');
            } finally {
                await handle.close();
            }
        },
        async write(value) {
            const temporary = `${file}.${randomUUID()}.tmp`;
            try {
                await fs.writeFile(temporary, value, { mode: 0o600, flag: 'wx' });
                await fs.rename(temporary, file);
            } finally {
                await fs.rm(temporary, { force: true });
            }
        },
        async remove() {
            await fs.rm(file, { force: true });
        },
    };
}
