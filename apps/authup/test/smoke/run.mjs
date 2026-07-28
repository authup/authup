#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Smoke test for the authup launcher CLI.
 *
 * Default (workspace) variant: runs the built dist entry of apps/authup against
 * the built workspace artifacts of apps/server-core (dist/cli/index.mjs) and
 * apps/client-web (.output/server/index.mjs), boots both on unusual ports with
 * a sqlite database, waits until both answer HTTP 200, then terminates the CLI
 * with SIGTERM and asserts a clean exit.
 *
 * --packed variant: npm-packs the workspaces into tarballs, installs them into
 * a fresh temp project, and runs the installed `authup` bin the same way. This
 * exercises the published-package layout (bin fields, files whitelists, ESM
 * entry) that the workspace variant cannot catch.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SERVER_PORT = 4310;
const WEB_PORT = 4311;
// Deliberately neither of the two above: seeded into the children's inherited
// environment to prove the supervisor overrides PORT per child.
const AMBIENT_PORT = 4312;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}/`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}/`;

const READY_TIMEOUT_MS = 180_000;
const EXIT_TIMEOUT_MS = 30_000;
const RUN_TIMEOUT_MS = 600_000;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageDirectory = path.resolve(scriptDirectory, '..', '..');
const repositoryDirectory = path.resolve(packageDirectory, '..', '..');

const packed = process.argv.includes('--packed');

function log(message) {
    process.stdout.write(`[smoke] ${message}\n`);
}

function fail(message) {
    process.stderr.write(`[smoke] ERROR: ${message}\n`);
    process.exitCode = 1;
    return new Error(message);
}

function assertFileExists(filePath, hint) {
    if (!fs.existsSync(filePath)) {
        throw fail(`missing artifact ${filePath} (${hint})`);
    }
}

function createTempDirectory(name) {
    return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`)));
}

function buildChildEnv(writableDirectory) {
    const env = { ...process.env };

    delete env.PORT;
    delete env.HOST;
    delete env.PUBLIC_URL;
    delete env.API_URL;
    delete env.NODE_ENV;
    for (const key of Object.keys(env)) {
        if (key.startsWith('DB_') || key.startsWith('NUXT_') || key.startsWith('NITRO_')) {
            delete env[key];
        }
    }

    env.NODE_ENV = 'development';
    env.WRITABLE_DIRECTORY_PATH = writableDirectory;
    env.DB_TYPE = 'better-sqlite3';
    env.DB_DATABASE = path.join(writableDirectory, 'authup.sql');

    // Children inherit this environment, so an ambient PORT/HOST must not be
    // able to reach both of them (a PaaS injects one; the project Dockerfile
    // sets PORT=3000). The supervisor is expected to override it per child —
    // verified: reverting that override makes client-web bind AMBIENT_PORT and
    // this scenario fails on the readiness probe.
    env.PORT = `${AMBIENT_PORT}`;
    env.HOST = '0.0.0.0';

    return env;
}

function writeLauncherConfig(directory) {
    fs.writeFileSync(path.join(directory, 'authup.conf'), [
        `server.core.port=${SERVER_PORT}`,
        'server.core.host=127.0.0.1',
        `server.core.publicUrl=http://127.0.0.1:${SERVER_PORT}`,
        `client.web.port=${WEB_PORT}`,
        'client.web.host=127.0.0.1',
    ].join('\n'));
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function probe(url) {
    try {
        const response = await fetch(url, { redirect: 'follow' });
        return response.status;
    } catch {
        return undefined;
    }
}

async function waitUntilReady(name, url, child) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < READY_TIMEOUT_MS) {
        if (child.exitCode !== null) {
            throw fail(`${name}: launcher exited (code ${child.exitCode}) before ${url} became ready.`);
        }

        const status = await probe(url);
        if (status === 200) {
            log(`${name}: ready after ${Math.round((Date.now() - startedAt) / 1000)}s (${url}).`);
            return;
        }

        await sleep(1_000);
    }

    throw fail(`${name}: ${url} did not answer 200 within ${READY_TIMEOUT_MS}ms.`);
}

function waitForExit(child, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            reject(fail(`launcher did not exit within ${timeoutMs}ms after SIGTERM.`));
        }, timeoutMs);

        child.on('exit', (code, signal) => {
            clearTimeout(timeout);
            resolve({ code, signal });
        });
    });
}

function run(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'inherit'],
            ...options,
        });

        let stdout = '';
        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });

        // The packed variant shells out to `npm pack` / `npm install`, which
        // reach the registry — without a deadline a stalled request would hang
        // the CI job until the workflow-level timeout.
        const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            reject(fail(`${command} ${args.join(' ')} did not finish within ${RUN_TIMEOUT_MS}ms.`));
        }, RUN_TIMEOUT_MS);

        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        child.on('exit', (code) => {
            clearTimeout(timeout);

            if (code === 0) {
                resolve(stdout);
            } else {
                reject(fail(`${command} ${args.join(' ')} exited with code ${code}.`));
            }
        });
    });
}

async function executeScenario(name, cliExec, cliArgs, cwd) {
    const tempDirectory = createTempDirectory(`authup-smoke-${name}`);
    const writableDirectory = path.join(tempDirectory, 'writable');
    fs.mkdirSync(writableDirectory, { recursive: true });
    writeLauncherConfig(tempDirectory);

    log(`${name}: starting ${cliExec} ${cliArgs.join(' ')}`);

    const child = spawn(cliExec, [...cliArgs, 'start', `--configDirectory=${tempDirectory}`], {
        cwd,
        env: buildChildEnv(writableDirectory),
        stdio: 'inherit',
    });

    try {
        await waitUntilReady(`${name}/server-core`, SERVER_URL, child);
        await waitUntilReady(`${name}/client-web`, WEB_URL, child);

        log(`${name}: sending SIGTERM.`);
        child.kill('SIGTERM');

        const { code, signal } = await waitForExit(child, EXIT_TIMEOUT_MS);
        if (code !== 0) {
            throw fail(`${name}: launcher exited with code ${code} (signal ${signal}), expected 0.`);
        }

        await sleep(500);

        const serverStatus = await probe(SERVER_URL);
        const webStatus = await probe(WEB_URL);
        if (typeof serverStatus !== 'undefined' || typeof webStatus !== 'undefined') {
            throw fail(`${name}: a child is still listening after shutdown (server: ${serverStatus}, web: ${webStatus}).`);
        }

        log(`${name}: launcher exited cleanly, both children stopped.`);
    } finally {
        if (child.exitCode === null) {
            child.kill('SIGTERM');
            await sleep(2_000);
            if (child.exitCode === null) {
                child.kill('SIGKILL');
            }
        }

        fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
}

async function executeWorkspaceScenario() {
    const cliEntry = path.join(packageDirectory, 'dist', 'index.mjs');
    assertFileExists(cliEntry, 'run: npm run build -w apps/authup');
    assertFileExists(
        path.join(repositoryDirectory, 'apps', 'server-core', 'dist', 'cli', 'index.mjs'),
        'run: npm run build -w apps/server-core',
    );
    assertFileExists(
        path.join(repositoryDirectory, 'apps', 'client-web', '.output', 'server', 'index.mjs'),
        'run: npm run build -w apps/client-web',
    );

    // cwd apps/server-core: typeorm resolves nested workspace driver installs
    // (better-sqlite3) via its process.cwd() fallback — a monorepo-hoisting
    // quirk only; flat installs (the --packed variant) are unaffected.
    await executeScenario(
        'workspace',
        process.execPath,
        [cliEntry],
        path.join(repositoryDirectory, 'apps', 'server-core'),
    );
}

function collectPackWorkspaces() {
    const workspaces = [
        'apps/authup',
        'apps/server-core',
        'apps/client-web',
    ];

    const packagesDirectory = path.join(repositoryDirectory, 'packages');
    for (const entry of fs.readdirSync(packagesDirectory)) {
        if (fs.existsSync(path.join(packagesDirectory, entry, 'package.json'))) {
            workspaces.push(`packages/${entry}`);
        }
    }

    return workspaces;
}

async function executePackedScenario() {
    const packDirectory = createTempDirectory('authup-smoke-pack');
    const installDirectory = createTempDirectory('authup-smoke-install');

    try {
        const workspaces = collectPackWorkspaces();

        log(`packed: packing ${workspaces.length} workspaces ...`);
        const packStartedAt = Date.now();
        const packArgs = [
            'pack',
            '--pack-destination', 
            packDirectory,
            ...workspaces.flatMap((workspace) => ['-w', workspace]),
        ];
        await run('npm', packArgs, { cwd: repositoryDirectory });
        const tarballs = fs.readdirSync(packDirectory)
            .filter((entry) => entry.endsWith('.tgz'))
            .map((entry) => path.join(packDirectory, entry));
        if (tarballs.length !== workspaces.length) {
            throw fail(`packed: expected ${workspaces.length} tarballs, found ${tarballs.length}.`);
        }
        log(`packed: pack took ${Math.round((Date.now() - packStartedAt) / 1000)}s (${tarballs.length} tarballs).`);

        fs.writeFileSync(path.join(installDirectory, 'package.json'), JSON.stringify({
            name: 'authup-smoke-install',
            version: '0.0.0',
            private: true,
        }));

        log('packed: installing tarballs ...');
        const installStartedAt = Date.now();
        // --force mirrors the documented workspace install (transient peer
        // range lag between lockstep releases, e.g. pinia); never
        // --legacy-peer-deps.
        await run('npm', [
            'install',
            '--force',
            '--no-audit',
            '--no-fund',
            ...tarballs,
        ], { cwd: installDirectory });
        log(`packed: install took ${Math.round((Date.now() - installStartedAt) / 1000)}s.`);

        const installedBin = path.join(installDirectory, 'node_modules', '.bin', 'authup');
        assertFileExists(installedBin, 'the installed authup package exposes no bin');

        await executeScenario(
            'packed',
            installedBin,
            [],
            installDirectory,
        );
    } finally {
        fs.rmSync(packDirectory, { recursive: true, force: true });
        fs.rmSync(installDirectory, { recursive: true, force: true });
    }
}

const startedAt = Date.now();

try {
    if (packed) {
        await executePackedScenario();
    } else {
        await executeWorkspaceScenario();
    }

    log(`done in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
} catch (e) {
    process.stderr.write(`[smoke] failed after ${Math.round((Date.now() - startedAt) / 1000)}s: ${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
}
