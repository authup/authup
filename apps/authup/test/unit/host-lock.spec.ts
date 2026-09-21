/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { withHostLock } from '../../src/host/lock.ts';

describe('withHostLock', () => {
    let directory : string;

    beforeEach(async () => {
        directory = await fs.mkdtemp(path.join(os.tmpdir(), 'authup-cli-lock-'));
    });

    afterEach(async () => {
        await fs.rm(directory, { recursive: true, force: true });
    });

    it('runs the callback, returns its value and releases the lock', async () => {
        const result = await withHostLock(directory, async () => 42);

        expect(result).toBe(42);
        expect(await fs.readdir(directory)).toEqual([]);
    });

    it('serializes two callers: the second runs after the first released', async () => {
        const order : string[] = [];

        await Promise.all([
            withHostLock(directory, async () => {
                order.push('first:start');
                await new Promise((resolve) => { setTimeout(resolve, 150); });
                order.push('first:end');
            }),
            (async () => {
                await new Promise((resolve) => { setTimeout(resolve, 20); });
                await withHostLock(directory, async () => { order.push('second'); });
            })(),
        ]);

        expect(order).toEqual(['first:start', 'first:end', 'second']);
    });

    it('takes over a stale lock instead of asking for it to be removed by hand', async () => {
        const lock = path.join(directory, 'hosts.lock');
        await fs.writeFile(lock, '');
        const stale = new Date(Date.now() - 60_000);
        await fs.utimes(lock, stale, stale);

        await expect(withHostLock(directory, async () => 'ok')).resolves.toBe('ok');
        expect(await fs.readdir(directory)).toEqual([]);
    });

    it('releases the lock when the callback throws', async () => {
        await expect(withHostLock(directory, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
        expect(await fs.readdir(directory)).toEqual([]);
    });

    it('creates the directory when it is missing', async () => {
        const nested = path.join(directory, 'authup');

        await withHostLock(nested, async () => undefined);

        expect((await fs.stat(nested)).isDirectory()).toBe(true);
    });
});
