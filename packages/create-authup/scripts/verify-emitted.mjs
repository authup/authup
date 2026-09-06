#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Verifies what the wizard writes against the tools that consume it, which is the half a unit test cannot reach:
 * `docker compose config` and `nginx -t` for the compose targets, `helm template` against the LIVE chart for the helm
 * target, and `authup config validate` for the bare-metal document. It also holds the vendored chart fixtures to the
 * live chart, so `test/unit/helm-schema.spec.ts` cannot validate against a snapshot that has since moved.
 *
 * The chart comes from the helm repository rather than a checkout in this one: `helm repo add authup
 * https://helm.authup.org` is what an operator runs, so the released chart is what the emitted values have to satisfy.
 * Pass `--chart <path>` to point at a local chart directory instead (an unreleased branch, or an offline run).
 *
 * Needs a built `packages/create-authup/dist`. A tool that is absent makes its checks SKIP, unless the run is strict
 * (`--strict`, or any CI environment), where a missing tool fails instead: skipping silently in CI would turn this
 * into a job that always passes.
 */

/* eslint-disable no-console */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = path.resolve(packageDirectory, '..', '..');
const bin = path.join(packageDirectory, 'dist', 'index.mjs');
const cli = path.join(repositoryDirectory, 'apps', 'authup', 'dist', 'index.mjs');

const args = process.argv.slice(2);
const strict = args.includes('--strict') || Boolean(process.env.CI);
const chartArgument = args.indexOf('--chart');
const localChart = chartArgument === -1 ? undefined : args[chartArgument + 1];

const results = [];
const temporaries = [];

if (!fs.existsSync(bin)) {
    console.error(`${bin} does not exist. Build it first: npm run build -w packages/create-authup`);
    process.exit(1);
}

function record(name, status, detail = '') {
    results.push({
        name, 
        status, 
        detail, 
    });
    const mark = {
        pass: 'PASS', 
        fail: 'FAIL', 
        skip: 'SKIP', 
    }[status];
    console.log(`${mark}  ${name}${detail ? `\n      ${detail.replace(/\n/g, '\n      ')}` : ''}`);
}

function run(command, commandArgs, options = {}) {
    const result = spawnSync(command, commandArgs, { encoding: 'utf8', ...options });

    return {
        ok: result.status === 0,
        status: result.status,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        spawnError: result.error,
    };
}

function has(command) {
    return run(command, ['--version']).ok || run(command, ['version']).ok;
}

function missing(name, tool) {
    if (strict) {
        record(name, 'fail', `${tool} is required in a strict run and was not found.`);

        return;
    }

    record(name, 'skip', `${tool} was not found.`);
}

/** Drive the built bin with a scripted answer list, and fail loudly when it writes nothing. */
function renderTarget(name, answers) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'create-authup-verify-'));
    temporaries.push(cwd);
    const result = run(process.execPath, [bin], { cwd, input: `${answers.join('\n')}\n` });
    if (!result.ok) {
        throw new Error(`the wizard exited ${result.status} for ${name}:\n${result.stdout}\n${result.stderr}`);
    }

    const written = fs.readdirSync(cwd);
    if (written.length === 0) {
        throw new Error(`the wizard wrote nothing for ${name}:\n${result.stdout}`);
    }

    return {
        cwd, 
        written, 
        stdout: result.stdout, 
    };
}

/**
 * The scenarios. `expect` is what the answers were meant to produce: without it a change to the prompt ORDER would
 * silently render a different, still-valid deployment and every check below would go on passing.
 */
const PUBLIC_URL = 'https://auth.example.com';
const SCENARIOS = {
    compose: {
        // target, url, database, bundled, db password, registration, recovery, admin password, worker, console, redis
        answers: ['compose', PUBLIC_URL, 'postgres', 'y', 'db-secret', 'n', 'n', 'admin-secret', 'n', 'n', 'n'],
        expect: { 'docker-compose.yml': ['command: start', 'image: postgres:17', 'DB_PASSWORD=${DB_PASSWORD}'] },
    },
    'compose-split': {
        answers: ['compose', PUBLIC_URL, 'postgres', 'y', 'db-secret', 'n', 'n', 'admin-secret', 'y', 'y'],
        expect: {
            'docker-compose.yml': ['command: start core', 'command: start console', 'command: start worker', 'image: nginx:'],
            'nginx.conf': ['upstream authup_api', 'location = /console/admin/callback'],
        },
    },
    helm: {
        // target, url, cert-manager, database, bundled, db password, registration, recovery, admin, worker, console, redis
        answers: ['helm', PUBLIC_URL, 'y', 'postgres', 'y', 'db-secret', 'n', 'n', 'admin-secret', 'y', 'y'],
        expect: { 'values.yaml': ['splitConsoles: true', 'enabled: true', 'certManager: true'] },
    },
    'helm-plain': {
        answers: ['helm', PUBLIC_URL, 'n', 'mysql', 'n', 'db.internal', '3306', 'authup', 'db-secret', 'authup', 'n', 'n', 'admin-secret', 'n', 'n', 'n'],
        expect: { 'values.yaml': ['type: mysql', 'externalDatabase:'] },
    },
    'bare-metal': {
        // target, url, database, host, port, username, password, name, registration, recovery, admin, redis
        answers: ['bare-metal', PUBLIC_URL, 'postgres', 'db.internal', '5432', 'authup', 'db-secret', 'authup', 'n', 'n', 'admin-secret', 'n'],
        expect: { 'authup.yml': ['publicUrl:', 'trustProxy:'], '.env': ['DB_PASSWORD=db-secret'] },
    },
};

const rendered = {};
for (const [name, scenario] of Object.entries(SCENARIOS)) {
    try {
        const output = renderTarget(name, scenario.answers);
        rendered[name] = output;

        const wrong = [];
        for (const [file, needles] of Object.entries(scenario.expect)) {
            if (!output.written.includes(file)) {
                wrong.push(`${file} was not written (got: ${output.written.join(', ')})`);
                continue;
            }

            const content = fs.readFileSync(path.join(output.cwd, file), 'utf8');
            for (const needle of needles) {
                if (!content.includes(needle)) {
                    wrong.push(`${file} does not carry ${JSON.stringify(needle)}`);
                }
            }
        }

        if (wrong.length > 0) {
            // the answers no longer mean what the scenario says, which is a prompt-order change
            record(`render ${name}`, 'fail', wrong.join('\n'));
            continue;
        }

        record(`render ${name}`, 'pass', output.written.join(', '));
    } catch (error) {
        record(`render ${name}`, 'fail', error instanceof Error ? error.message : String(error));
    }
}

// ---------------------------------------------------------------- compose

if (!has('docker')) {
    missing('docker compose config', 'docker');
} else {
    for (const name of ['compose', 'compose-split']) {
        const output = rendered[name];
        if (!output) {
            continue;
        }

        const result = run('docker', ['compose', '--project-directory', output.cwd, '-f', path.join(output.cwd, 'docker-compose.yml'), 'config', '-q']);
        record(`docker compose config (${name})`, result.ok ? 'pass' : 'fail', result.ok ? '' : result.stderr.trim());
    }

    const split = rendered['compose-split'];
    if (split) {
        // nginx reads the config the console split emits; a syntax error there is a deployment that never serves.
        // `nginx -t` resolves every upstream host, and these two exist only on the compose network, so they are
        // pointed at the loopback for the test: the config is what is under test here, not DNS.
        const result = run('docker', [
            'run', 
            '--rm',
            '--add-host', 
            'authup:127.0.0.1',
            '--add-host', 
            'authup-console:127.0.0.1',
            '-v', 
            `${path.join(split.cwd, 'nginx.conf')}:/etc/nginx/conf.d/default.conf:ro`,
            'nginx:1.31-alpine', 
            'nginx', 
            '-t',
        ]);
        record('nginx -t (compose-split)', result.ok ? 'pass' : 'fail', result.ok ? '' : `${result.stdout}${result.stderr}`.trim());
    }
}

// ---------------------------------------------------------------- helm, against the live chart

function resolveChart() {
    if (localChart) {
        return { path: localChart, origin: `local ${localChart}` };
    }

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'create-authup-chart-'));
    temporaries.push(directory);

    // Every step here is a network call, and a blip would read as a drifted fixture, which is the one verdict this
    // script must not report wrongly.
    const attempt = (label, commandArgs) => {
        let last;
        for (let index = 0; index < 3; index++) {
            last = run('helm', commandArgs);
            if (last.ok) {
                return;
            }
        }

        throw new Error(`${label} failed after 3 attempts: ${last.stderr.trim()}`);
    };

    attempt('helm repo add', ['repo', 'add', 'authup', 'https://helm.authup.org', '--force-update']);
    attempt('helm repo update', ['repo', 'update', 'authup']);
    attempt('helm pull', ['pull', 'authup/authup', '--untar', '--untardir', directory]);

    return { path: path.join(directory, 'authup'), origin: 'the released chart at https://helm.authup.org' };
}

if (!has('helm')) {
    missing('helm template', 'helm');
} else {
    let chart;
    try {
        chart = resolveChart();
        record('resolve chart', 'pass', chart.origin);
    } catch (error) {
        record('resolve chart', 'fail', error instanceof Error ? error.message : String(error));
    }

    if (chart) {
        for (const name of ['helm', 'helm-plain']) {
            const output = rendered[name];
            if (!output) {
                continue;
            }

            const result = run('helm', ['template', 'authup', chart.path, '-f', path.join(output.cwd, 'values.yaml')]);
            record(`helm template (${name})`, result.ok ? 'pass' : 'fail', result.ok ? '' : result.stderr.trim());
        }

        // The unit suite validates every emitted document against these two files. They are a snapshot, so this is
        // what keeps the snapshot honest: a chart release that moves either one has to be vendored again.
        for (const file of ['values.schema.json', 'values.yaml']) {
            const vendored = path.join(packageDirectory, 'test', 'fixtures', `helm-${file}`);
            const live = path.join(chart.path, file);
            const same = fs.existsSync(live) && fs.readFileSync(vendored, 'utf8') === fs.readFileSync(live, 'utf8');
            record(
                `fixture matches ${file}`,
                same ? 'pass' : 'fail',
                same ? '' : `refresh it: cp ${live} ${vendored}`,
            );
        }
    }
}

// ---------------------------------------------------------------- bare metal

const bareMetal = rendered['bare-metal'];
if (bareMetal) {
    if (!fs.existsSync(cli)) {
        missing('authup config validate', 'the built authup CLI (npm run build -w apps/authup)');
    } else {
        const result = run(process.execPath, [cli, 'config', 'validate'], { cwd: bareMetal.cwd });
        record('authup config validate', result.ok ? 'pass' : 'fail', result.ok ? '' : `${result.stdout}${result.stderr}`.trim());
    }
}

// ----------------------------------------------------------------

// Kept on a failure: the emitted documents are the evidence for whatever went wrong.
const failed = results.filter((result) => result.status === 'fail');
if (failed.length === 0) {
    for (const directory of temporaries) {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

const skipped = results.filter((result) => result.status === 'skip');
console.log(`\n${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped`);

if (failed.length > 0) {
    process.exit(1);
}
