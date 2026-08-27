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
const PUBLIC_URL = `http://127.0.0.1:${SERVER_PORT}`;
const SERVER_URL = `${PUBLIC_URL}/`;

// The port the config file names, deliberately not the one the environment
// names. The environment beats the file (spec invariant 8), so the CLI has to
// listen on SERVER_PORT; a regression that lets the file win moves the
// listener here and the readiness probe never answers.
const CONFIG_FILE_PORT = SERVER_PORT + 2;

// The split topology's three console listeners.
//
// Their public urls stay on publicUrl's own origin, which is the only shape
// authup supports and what the reverse proxy in front of a real split
// deployment presents. The proxy is what this runner stands in for: it
// strips the console's base path and re-targets the console's own port,
// which is exactly the hop `<segment>` -> the console set.
const CONSOLE_PORTS = {
    auth: SERVER_PORT + 10,
    admin: SERVER_PORT + 11,
    account: SERVER_PORT + 12,
};

const CONSOLE_SEGMENTS = {
    auth: '/console/auth',
    admin: '/console/admin',
    account: '/console/account',
};

/**
 * Route a PUBLIC url onto the console process that serves it, the way the
 * reverse proxy would: strip the console's base path, keep the rest, and
 * dial the console's own listener.
 */
function throughProxy(name, publicPath) {
    const stripped = publicPath.startsWith(CONSOLE_SEGMENTS[name]) ?
        publicPath.slice(CONSOLE_SEGMENTS[name].length) || '/' :
        publicPath;

    return `http://127.0.0.1:${CONSOLE_PORTS[name]}${stripped}`;
}

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

    // PORT and HOST name what the CLI has to listen on: the config file
    // written below disagrees about both, and the environment wins.
    env.PORT = `${SERVER_PORT}`;
    env.HOST = '0.0.0.0';

    return env;
}

function writeServerConfig(directory) {
    // publicUrl is the one key only this file can supply (PUBLIC_URL is
    // stripped from the child env, and the value server-core would derive from
    // HOST/PORT reads http://localhost:<port> instead), so reading it back out
    // of a served console shell is what proves the file was found and applied.
    fs.writeFileSync(path.join(directory, 'authup.yml'), [
        `publicUrl: ${PUBLIC_URL}`,
        'server:',
        '    core:',
        `        port: ${CONFIG_FILE_PORT}`,
        '        host: 127.0.0.1',
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
 * A protocol page GET must hand over to the console service, and land on it.
 *
 * The hop is where plan 101 D2 put the boundary: server-core keeps the
 * endpoint, the service keeps the render. A 302 into nothing answers the
 * API probe just as happily as a working one, so the target is fetched
 * separately by the caller.
 */
async function assertRedirectsToConsole(name, route, expectedPath) {
    const url = new URL(route, SERVER_URL).href;

    const response = await fetch(url, { redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) {
        throw fail(`${name}: ${url} answered ${response.status}, expected a redirect to the console service.`);
    }

    const location = response.headers.get('location') || '';
    const target = new URL(location, SERVER_URL);

    // In the composed topology the console rides the API's own listener, so
    // a hop leaving this origin means the mount was skipped and the console
    // is not being served at all.
    if (target.origin !== new URL(SERVER_URL).origin) {
        throw fail(`${name}: ${url} redirected off-origin to ${location}, expected the composed console on ${SERVER_URL}.`);
    }

    if (target.pathname !== expectedPath) {
        throw fail(`${name}: ${url} redirected to ${target.pathname}, expected exactly ${expectedPath}.`);
    }

    log(`${name}: ${url} handed over to ${location}.`);

    // Returned so the caller follows the hop it just validated rather than
    // a hard-coded path: a redirect somewhere unexpected would otherwise
    // pass while the shell was fetched from the route it should have left.
    return target;
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

/**
 * Assert that the config file at `--configDirectory` reached server-core.
 *
 * The static consoles inject `apiUrl` from `config.publicUrl`, and this run
 * sets publicUrl in the config file alone, so the value in the shell can only
 * come from there. Without it the CLI would still boot on the port the
 * environment names and every other assertion here would pass unchanged.
 */
function assertConfigFileApplied(name, shell) {
    const marker = `"apiUrl":"${PUBLIC_URL}"`;

    if (!shell.includes(marker)) {
        throw fail(`${name}: the console config does not carry ${marker}, so authup.yml from --configDirectory was not applied.`);
    }

    log(`${name}: authup.yml was applied (publicUrl ${PUBLIC_URL}).`);
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
    // Already gone: `exit` fired before this listener could attach, and it
    // fires once. Waiting for it would sit out the whole timeout, which is
    // what a scenario awaiting a SECOND process runs into.
    if (child.exitCode !== null || child.signalCode !== null) {
        return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
    }

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
        // The auth console renders in its own service since plan 101 D2-2.
        // `authup start` composes that service onto this listener, so the
        // protocol route hands over and the console answers the hop. Both
        // halves are asserted: a forward that lands nowhere would otherwise
        // look exactly like a working one from the API side.
        const authConsoleURL = await assertRedirectsToConsole(
            `${name}/client-auth-console`,
            'logout',
            '/console/auth/logout',
        );
        const authShell = await assertConsoleServed(
            `${name}/client-auth-console`,
            authConsoleURL.href,
            'window.__AUTHUP__',
        );
        await assertConsoleAssetServed(
            `${name}/client-auth-console`,
            authConsoleURL.href,
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

        // Readiness above already proved the environment beat the config file
        // on the port; this proves the file was read at all.
        assertConfigFileApplied(`${name}/config`, adminShell);

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

/**
 * The split topology (plan 101 D2): the API and the consoles as separate
 * processes, which is what an operator runs when `/console/**` is routed to
 * its own replica set.
 *
 * Simulated by direct ports rather than a proxy, so the console urls carry
 * no path and each service answers at its own root. That is exactly what a
 * prefix-stripping proxy delivers, and it is the shape a proxy-less local
 * run has anyway.
 *
 * What this proves that the composed scenario cannot: `authup core` serves
 * no console at all (the shed), `authup console` serves all three on its
 * own, and the hop between them lands. A regression in either half looks
 * identical from inside one process.
 */
async function executeSplitScenario() {
    const tempDirectory = createTempDirectory('authup-smoke-split');
    const writableDirectory = path.join(tempDirectory, 'writable');
    fs.mkdirSync(writableDirectory, { recursive: true });
    writeServerConfig(tempDirectory);

    const cliEntry = path.join(packageDirectory, 'dist', 'index.mjs');
    const cwd = path.join(repositoryDirectory, 'apps', 'server-core');
    const configArg = `--configDirectory=${tempDirectory}`;

    // Only the listen addresses: every console url keeps its default, which
    // is publicUrl plus the segment its bundle is built for.
    const consoleEnv = {
        AUTH_CONSOLE_PORT: `${CONSOLE_PORTS.auth}`,
        ADMIN_CONSOLE_PORT: `${CONSOLE_PORTS.admin}`,
        ACCOUNT_CONSOLE_PORT: `${CONSOLE_PORTS.account}`,
    };

    const api = spawn(process.execPath, [cliEntry, 'core', configArg], {
        cwd,
        env: { ...buildChildEnv(writableDirectory), ...consoleEnv },
        stdio: 'inherit',
    });

    const consoles = spawn(process.execPath, [cliEntry, 'console', configArg], {
        cwd,
        env: { ...buildChildEnv(writableDirectory), ...consoleEnv },
        stdio: 'inherit',
    });

    try {
        await waitUntilReady('split/core', SERVER_URL, api);
        await waitUntilReady('split/console', throughProxy('auth', '/healthy'), consoles);

        // The shed: every console page is a 404 on the API now. A shell
        // answered here would mean both sides serve it, with whichever
        // mounted first winning silently.
        for (const route of ['console/auth/logout', 'console/admin', 'console/account']) {
            const response = await fetch(new URL(route, SERVER_URL).href, { redirect: 'manual' });
            if (response.status !== 404) {
                throw fail(`split/core: /${route} answered ${response.status}, expected 404: server-core serves no console.`);
            }
            await response.arrayBuffer();
        }
        log('split/core: the API serves no console page.');

        // The hop, which is the only thing tying the two processes together.
        const logout = await fetch(new URL('logout', SERVER_URL).href, { redirect: 'manual' });
        // Drained like every other body here: an undrained response leaves
        // the socket mid-write and `server.close()` waits for it, so the
        // SIGTERM assertion below would only pass through the force-exit.
        await logout.arrayBuffer();
        const location = logout.headers.get('location') || '';
        const expected = new URL(`${CONSOLE_SEGMENTS.auth}/logout`, SERVER_URL).href;
        if (location !== expected) {
            throw fail(`split/core: /logout redirected to "${location}", expected ${expected}.`);
        }
        log(`split/core: /logout handed over to ${location}.`);

        for (const name of Object.keys(CONSOLE_PORTS)) {
            // The page the proxy would forward: the auth console renders
            // /logout with no backend at all, the static consoles their shell.
            const publicPath = name === 'auth' ? `${CONSOLE_SEGMENTS.auth}/logout` : CONSOLE_SEGMENTS[name];
            const target = throughProxy(name, publicPath);

            const response = await fetch(target, { redirect: 'manual' });
            if (response.status !== 200) {
                throw fail(`split/console: ${target} answered ${response.status}, expected 200.`);
            }

            const body = await response.text();
            if (!body.includes('window.__AUTHUP__')) {
                throw fail(`split/console: ${target} answered 200 without the injected runtime config.`);
            }

            // The href the shell carries is the PUBLIC one, so it is routed
            // the same way the page was. A console that emitted an href
            // outside its own base would be dialled at a path its service
            // does not serve.
            const match = /<script[^>]+src="([^"]*\/assets\/[^"]+\.js)"/.exec(body);
            if (!match) {
                throw fail(`split/console/${name}: the shell references no script under assets/.`);
            }

            const asset = await fetch(throughProxy(name, match[1]), { redirect: 'manual' });
            if (asset.status !== 200 || !(asset.headers.get('content-type') || '').includes('javascript')) {
                throw fail(`split/console/${name}: ${match[1]} answered ${asset.status} (${asset.headers.get('content-type')}), expected JavaScript.`);
            }
            const bytes = await asset.arrayBuffer();

            log(`split/console/${name}: ${match[1]} served the console entry script (${bytes.byteLength} bytes).`);
        }

        log('split: sending SIGTERM to both processes.');
        api.kill('SIGTERM');
        consoles.kill('SIGTERM');

        const apiExit = await waitForExit(api, EXIT_TIMEOUT_MS);
        if (apiExit.code !== 0) {
            throw fail(`split/core: exited with code ${apiExit.code}, expected 0.`);
        }

        const consoleExit = await waitForExit(consoles, EXIT_TIMEOUT_MS);
        if (consoleExit.code !== 0) {
            throw fail(`split/console: exited with code ${consoleExit.code}, expected 0.`);
        }

        log('split: both processes exited cleanly.');
    } finally {
        for (const child of [api, consoles]) {
            if (child.exitCode === null) {
                child.kill('SIGTERM');
            }
        }
        await sleep(2_000);
        for (const child of [api, consoles]) {
            if (child.exitCode === null) {
                child.kill('SIGKILL');
            }
        }

        fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
}

function collectPackWorkspaces() {
    const workspaces = [
        'apps/authup',
        'apps/server-core',
        // The CLI depends on the three console SERVICES, and each of those
        // resolves its console's built bundle at runtime. Without their
        // tarballs the packed install would try (and fail) to fetch any of
        // the six from the registry.
        'apps/server-account-console',
        'apps/server-admin-console',
        'apps/server-auth-console',
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
        await executeSplitScenario();
    }

    log(`done in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
} catch (e) {
    process.stderr.write(`[smoke] failed after ${Math.round((Date.now() - startedAt) / 1000)}s: ${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
}
