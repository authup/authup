/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';

// Runs the BUILT bin (dist/index.mjs), so this suite needs `npm run build` first, like the console service specs.
const BIN = fileURLToPath(new URL('../../dist/index.mjs', import.meta.url));
const VERSION: string = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
const TIMEOUT = 20_000;

const URL_ANSWER = 'https://auth.example.com';

// target, url, database, bundled, db password, registration, recovery, admin password, worker, console, redis
const COMPOSE_LINES = ['compose', URL_ANSWER, '', '', 'db-secret', '', '', 'admin-secret', '', '', ''];

// target, url, database, registration, recovery, admin password, redis
const SQLITE_LINES = ['bare-metal', URL_ANSWER, 'sqlite', '', '', 'admin-secret', ''];

type RunResult = {
    code: number | null,
    stdout: string,
    stderr: string
};

function runWizard(cwd: string, lines: string[], flags: string[] = []): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [BIN, ...flags], { cwd, stdio: 'pipe' });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
        child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', (code) => resolve({
            code,
            stdout,
            stderr,
        }));

        // `--help` exits before reading stdin, which surfaces here as EPIPE rather than as a failure of the run.
        child.stdin.on('error', () => undefined);
        child.stdin.end(lines.map((line) => `${line}\n`).join(''));
    });
}

describe('create-authup bin', () => {
    const dirs: string[] = [];

    function createTempDir(): string {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-authup-'));
        dirs.push(dir);

        return dir;
    }

    afterEach(() => {
        for (const dir of dirs) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        dirs.length = 0;
    });

    it('should write the compose files on the default flow', async () => {
        const cwd = createTempDir();

        const result = await runWizard(cwd, COMPOSE_LINES);

        expect(result.stderr).toEqual('');
        expect(result.code).toEqual(0);
        expect(fs.existsSync(path.join(cwd, 'docker-compose.yml'))).toBeTruthy();
        expect(fs.existsSync(path.join(cwd, '.env'))).toBeTruthy();
        expect(result.stdout).toContain('docker compose up -d');
    }, TIMEOUT);

    it('should refuse to overwrite existing files and leave them untouched', async () => {
        const cwd = createTempDir();
        await runWizard(cwd, COMPOSE_LINES);
        const composePath = path.join(cwd, 'docker-compose.yml');
        fs.appendFileSync(composePath, '# marker\n');
        const marked = fs.readFileSync(composePath);
        const dotenv = fs.readFileSync(path.join(cwd, '.env'));

        const result = await runWizard(cwd, COMPOSE_LINES);

        expect(result.code).toEqual(1);
        expect(result.stderr).toContain('Refusing to overwrite');
        expect(result.stderr).toContain('docker-compose.yml');
        expect(fs.readFileSync(composePath).equals(marked)).toBeTruthy();
        expect(fs.readFileSync(path.join(cwd, '.env')).equals(dotenv)).toBeTruthy();
    }, TIMEOUT);

    it('should overwrite existing files with --force', async () => {
        const cwd = createTempDir();
        await runWizard(cwd, COMPOSE_LINES);
        const composePath = path.join(cwd, 'docker-compose.yml');
        fs.appendFileSync(composePath, '# marker\n');

        const result = await runWizard(cwd, COMPOSE_LINES, ['--force']);

        expect(result.stderr).toEqual('');
        expect(result.code).toEqual(0);
        expect(fs.readFileSync(composePath, 'utf8')).not.toContain('# marker');
    }, TIMEOUT);

    it('should print the four targets on --help', async () => {
        const result = await runWizard(createTempDir(), [], ['--help']);

        expect(result.code).toEqual(0);
        for (const target of ['docker', 'compose', 'helm', 'bare-metal']) {
            expect(result.stdout).toContain(target);
        }
    }, TIMEOUT);

    it('should write a bare-metal sqlite project depending on its own version', async () => {
        const cwd = createTempDir();

        const result = await runWizard(cwd, SQLITE_LINES);

        expect(result.stderr).toEqual('');
        expect(result.code).toEqual(0);
        expect(fs.existsSync(path.join(cwd, 'authup.yml'))).toBeTruthy();
        expect(fs.existsSync(path.join(cwd, '.env'))).toBeTruthy();
        const manifest = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
        expect(manifest.dependencies.authup).toEqual(`^${VERSION}`);
    }, TIMEOUT);
});
