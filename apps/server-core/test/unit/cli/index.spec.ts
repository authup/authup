/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { DIST_PATH } from '../../../src/path';

const execFileAsync = promisify(execFile);

describe('src/cli/index', () => {
    let directory : string;

    beforeEach(async () => {
        directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'authup-cli-'));
    });

    afterEach(async () => {
        await fs.promises.rm(directory, { recursive: true, force: true });
    });

    it('should print the usage from a directory without a package.json', async () => {
        const { stdout } = await execFileAsync(
            process.execPath,
            [path.join(DIST_PATH, 'cli', 'index.mjs'), '--help'],
            {
                cwd: directory,
                env: { ...process.env, NO_COLOR: '1' },
            },
        );

        expect(stdout).toContain('@authup/server-core');
        expect(stdout).toContain('USAGE');
    }, 30_000);
});
