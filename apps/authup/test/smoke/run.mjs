#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Smoke test for the authup CLI.
 *
 * Default (workspace) variant: runs the built dist entry of apps/authup, which
 * boots server-core in process out of the built workspace artifact of
 * apps/server-core (dist/index.mjs), on an unusual port with a sqlite database,
 * waits until it answers HTTP 200 and serves all three consoles, then
 * terminates the CLI with SIGTERM and asserts a clean exit.
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
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}/`;

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

    // The environment beats the config file, so PORT has to name the port this
    // scenario probes; the file written below agrees with it and additionally
    // carries the publicUrl.
    env.PORT = `${SERVER_PORT}`;
    env.HOST = '0.0.0.0';

    return env;
}

function writeServerConfig(directory) {
    fs.writeFileSync(path.join(directory, 'authup.conf'), [
        `server.core.port=${SERVER_PORT}`,
        'server.core.host=127.0.0.1',
        `server.core.publicUrl=http://127.0.0.1:${SERVER_PORT}`,
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

/**
 * Assert that server-core can actually resolve and serve a console package.
 *
 * The `locateUpSync` walk that finds `@authup/client-auth-console` and
 * `@authup/client-account-console` exists specifically for the published
 * install layout, which only the packed scenario reproduces. Nothing else
 * exercises it: a resolution regression, or a tarball shipped without its
 * bundle (`npm pack` does not run `prepublishOnly`), degrades silently
 * because boot still succeeds and only the console routes break.
 */
async function assertConsoleServed(name, route, marker) {
    // SERVER_URL carries a trailing slash, so build the target with `new URL`
    // rather than interpolating (`${SERVER_URL}/logout` requests `//logout`).
    const url = new URL(route, SERVER_URL).href;

    let response;
    try {
        // Not `follow`: a redirect to some other page that happens to contain
        // the marker would hide a broken console route.
        response = await fetch(url, { redirect: 'manual' });
    } catch (e) {
        throw fail(`${name}: ${url} could not be reached (${e.message}).`);
    }

    if (response.status !== 200) {
        throw fail(`${name}: ${url} answered ${response.status}, expected 200 without a redirect. The console package is probably unresolved or unbuilt.`);
    }

    const body = await response.text();
    if (!body.includes(marker)) {
        throw fail(`${name}: ${url} answered 200 but the body does not contain ${marker}, so the console shell was not rendered.`);
    }

    log(`${name}: ${url} served the console shell.`);

    return body;
}

/**
 * Follow the first script asset a static console shell references.
 *
 * The vite base (`/console/admin/`, `/console/account/`, `/console/auth/`) is
 * baked into the shell's `src` attributes as `<base>assets/<hash>.js`, and the
 * server mounts the assets under its own constant for the same path. A dist built for another base is served
 * without any error: the shell answers 200 with its stale hrefs and the
 * browser renders a blank console. Fetching one href out of the shell and
 * expecting JavaScript back is what proves the two agree.
 */
async function assertConsoleAssetServed(name, route, shell) {
    const match = /<script[^>]+src="([^"]*\/assets\/[^"]+\.js)"/.exec(shell);
    if (!match) {
        throw fail(`${name}: the console shell references no script under assets/, so its entry cannot be located.`);
    }

    const url = new URL(match[1], new URL(route, SERVER_URL)).href;

    let response;
    try {
        response = await fetch(url, { redirect: 'manual' });
    } catch (e) {
        throw fail(`${name}: ${url} could not be reached (${e.message}).`);
    }

    if (response.status !== 200) {
        throw fail(`${name}: ${url} answered ${response.status}, expected 200. The console bundle was probably built for another base path than the server mounts it under.`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('javascript')) {
        throw fail(`${name}: ${url} answered 200 with content type "${contentType}", expected JavaScript.`);
    }

    // Drain the body. The entry bundles are >1 MB; an undrained response
    // leaves the socket mid-write, `server.close()` then waits for it, and
    // the SIGTERM assertion below only passes through the 10s force-exit.
    const body = await response.arrayBuffer();
    if (body.byteLength === 0) {
        throw fail(`${name}: ${url} answered 200 with an empty body.`);
    }

    log(`${name}: ${url} served the console entry script (${body.byteLength} bytes).`);
}

async function waitUntilReady(name, url, child) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < READY_TIMEOUT_MS) {
        if (child.exitCode !== null) {
            throw fail(`${name}: the CLI exited (code ${child.exitCode}) before ${url} became ready.`);
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
            reject(fail(`the CLI did not exit within ${timeoutMs}ms after SIGTERM.`));
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
    writeServerConfig(tempDirectory);

    log(`${name}: starting ${cliExec} ${cliArgs.join(' ')}`);

    const child = spawn(cliExec, [...cliArgs, 'start', `--configDirectory=${tempDirectory}`], {
        cwd,
        env: buildChildEnv(writableDirectory),
        stdio: 'inherit',
    });

    try {
        await waitUntilReady(`${name}/server-core`, SERVER_URL, child);

        // All three consoles are RUNTIME dependencies of server-core, resolved
        // out of node_modules and served from their built dist. Probing the
        // root URL alone leaves that resolution untested.
        const authShell = await assertConsoleServed(
            `${name}/client-auth-console`,
            'logout',
            'window.__AUTHUP__',
        );
        // The auth console's PAGES stay on their protocol routes; only its
        // assets moved under `/console/auth/assets/` (plan 099), so the same
        // stale-base check applies to the script the SSR shell references.
        await assertConsoleAssetServed(
            `${name}/client-auth-console`,
            'logout',
            authShell,
        );
        // window.__AUTHUP__ rather than the shell markup: it only appears if
        // the `<!--account-config-->` marker was found and replaced, which is
        // that console's entire runtime contract. Without it the SPA silently
        // degrades to deriving its API URL from the origin.
        const accountShell = await assertConsoleServed(
            `${name}/client-account-console`,
            'console/account',
            'window.__AUTHUP__',
        );
        await assertConsoleAssetServed(
            `${name}/client-account-console`,
            'console/account',
            accountShell,
        );
        // The admin console (plan 081), same contract: `<!--admin-config-->`.
        const adminShell = await assertConsoleServed(
            `${name}/client-admin-console`,
            'console/admin',
            'window.__AUTHUP__',
        );
        await assertConsoleAssetServed(
            `${name}/client-admin-console`,
            'console/admin',
            adminShell,
        );

        log(`${name}: sending SIGTERM.`);
        child.kill('SIGTERM');

        const { code, signal } = await waitForExit(child, EXIT_TIMEOUT_MS);
        if (code !== 0) {
            throw fail(`${name}: the CLI exited with code ${code} (signal ${signal}), expected 0.`);
        }

        await sleep(500);

        const serverStatus = await probe(SERVER_URL);
        if (typeof serverStatus !== 'undefined') {
            throw fail(`${name}: something is still listening after shutdown (server: ${serverStatus}).`);
        }

        log(`${name}: the CLI exited cleanly and stopped listening.`);
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
        path.join(repositoryDirectory, 'apps', 'server-core', 'dist', 'index.mjs'),
        'run: npm run build -w apps/server-core',
    );
    assertFileExists(
        path.join(repositoryDirectory, 'apps', 'client-admin-console', 'dist', 'index.html'),
        'run: npm run build -w apps/client-admin-console',
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
        // server-core resolves the account console SPA bundle and the auth
        // console SSR bundle from these packages at runtime — without their
        // tarballs the packed install would try (and fail) to fetch them
        // from the registry.
        'apps/client-account-console',
        'apps/client-auth-console',
        'apps/client-admin-console',
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
