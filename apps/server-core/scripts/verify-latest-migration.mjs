/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * Round-trips the newest migration against a POPULATED database.
 *
 * The tests-migrations CI job runs the chain forward and backward on an
 * empty schema, which cannot surface anything that only fails when rows
 * exist: a foreign key re-validating existing data, a column rewrite
 * losing values, a narrowing type change truncating. This boots the
 * real application so provisioning and a login write the baseline rows,
 * seeds the tables the newest migration touches, then reverts and
 * re-applies it and asserts nothing moved.
 *
 *   DB_TYPE=postgres DB_HOST=127.0.0.1 ... node scripts/verify-latest-migration.mjs
 *
 * Requires a built dist and a reachable database server; it drops and
 * recreates DB_DATABASE, so point it at a scratch database.
 */

import { spawn } from 'node:child_process';
import process from 'node:process';
import { DataSource } from 'typeorm';
import { createDatabase, dropDatabase } from 'typeorm-extension';
import {
    ClientEntity,
    ConsentEntity,
    DataSourceOptionsBuilder,
    RealmEntity,
    TrustAnchorEntity,
    UserAuthenticatorEntity,
    UserEntity,
} from '../dist/adapters/database/index.mjs';

const options = new DataSourceOptionsBuilder().buildWithEnv();
const dialect = options.type;
const port = Number(process.env.VERIFY_PORT || 34419);
const adminPassword = 'start123';

const results = [];
const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ ok, label });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
};

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function bootApplication() {
    const child = spawn('node', ['dist/cli/index.mjs', 'start'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: `${port}`,
            HOST: '127.0.0.1',
            USER_ADMIN_PASSWORD: adminPassword,
            PUBLIC_URL: `http://127.0.0.1:${port}`,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });

    for (let i = 0; i < 120; i++) {
        if (child.exitCode !== null) {
            throw new Error(`server exited early (${child.exitCode})\n${output}`);
        }

        try {
            const response = await fetch(`http://127.0.0.1:${port}/`);
            if (response.ok) {
                return child;
            }
        } catch {
            // not listening yet
        }

        await sleep(500);
    }

    child.kill('SIGKILL');
    throw new Error(`server did not become ready\n${output}`);
}

async function stopApplication(child) {
    child.kill('SIGTERM');

    for (let i = 0; i < 60; i++) {
        if (child.exitCode !== null || child.signalCode) {
            return;
        }

        await sleep(250);
    }

    child.kill('SIGKILL');
}

async function login() {
    const response = await fetch(`http://127.0.0.1:${port}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'password',
            username: 'admin',
            password: adminPassword,
        }).toString(),
    });

    if (!response.ok) {
        throw new Error(`login failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
}

await dropDatabase({ options, ifExist: true });
await createDatabase({
    options, 
    synchronize: false, 
    ifNotExist: true, 
});

console.log(`[${dialect}] booting the application to populate the schema`);
let child = await bootApplication();
const grant = await login();
check('login before migration round-trip', typeof grant.access_token === 'string', true);
await stopApplication(child);

const dataSource = new DataSource({ ...options, logging: false });
await dataSource.initialize();

const realm = await dataSource.getRepository(RealmEntity).findOneByOrFail({ name: 'master' });
const client = await dataSource.getRepository(ClientEntity).findOneByOrFail({ name: 'web' });

// the second factor is seeded on a dedicated user: on the admin it
// would make the password grant demand an otp and break the login probe
const userRepository = dataSource.getRepository(UserEntity);
const probeUser = await userRepository.save(userRepository.create({
    name: 'migration-probe',
    email: 'migration-probe@example.com',
    realmId: realm.id,
}));

const consentRepository = dataSource.getRepository(ConsentEntity);
await consentRepository.save(consentRepository.create({
    clientId: client.id,
    sub: probeUser.id,
    subKind: 'user',
    scope: 'openid',
    realmId: realm.id,
    userId: probeUser.id,
}));

const authenticatorRepository = dataSource.getRepository(UserAuthenticatorEntity);
await authenticatorRepository.save(authenticatorRepository.create({
    kind: 'recovery',
    codes: '[]',
    confirmed: true,
    userId: probeUser.id,
    realmId: realm.id,
}));

const trustAnchorRepository = dataSource.getRepository(TrustAnchorEntity);
await trustAnchorRepository.save(trustAnchorRepository.create({
    name: 'migration-probe-anchor',
    certificate: '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----',
    enabled: false,
    realmId: realm.id,
}));

const TABLES = [
    'auth_realms',
    'auth_users',
    'auth_clients',
    'auth_sessions',
    'auth_session_tokens',
    'auth_events',
    'auth_consents',
    'auth_trust_anchors',
    'auth_user_authenticators',
    'auth_permissions',
    'auth_policies',
];

const quote = (table) => (dialect === 'postgres' ? `"${table}"` : `\`${table}\``);

const snapshot = async () => {
    const out = {};

    for (const TABLE of TABLES) {
        const rows = await dataSource.query(`SELECT COUNT(*) AS c FROM ${quote(TABLE)}`);
        out[TABLE] = Number(rows[0].c);
    }

    return out;
};

const drift = async () => (await dataSource.driver.createSchemaBuilder().log()).upQueries.length;

const before = await snapshot();
console.log(`[${dialect}] populated: ${JSON.stringify(before)}`);
check('every asserted table holds rows', TABLES.every((table) => before[table] > 0), true);
check('no drift after the full chain', await drift(), 0);

await dataSource.undoLastMigration({ transaction: options.migrationsTransactionMode });
check('row counts unchanged after revert', await snapshot(), before);

await dataSource.runMigrations({ transaction: options.migrationsTransactionMode });
check('row counts unchanged after re-run', await snapshot(), before);
check('no drift after re-run', await drift(), 0);

let rejected = false;
try {
    await dataSource.query(
        dialect === 'postgres' ?
            'INSERT INTO "auth_consents" ("id", "client_id", "sub", "sub_kind", "scope", "realm_id") VALUES ($1, $2, $3, $4, $5, $6)' :
            'INSERT INTO `auth_consents` (`id`, `client_id`, `sub`, `sub_kind`, `scope`, `realm_id`) VALUES (?, ?, ?, ?, ?, ?)',
        [
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-0000000000ff',
            probeUser.id,
            'user',
            'profile',
            realm.id,
        ],
    );
} catch {
    rejected = true;
}
check('foreign keys reject an orphan insert', rejected, true);

const cascadeUser = await userRepository.save(userRepository.create({
    name: 'migration-cascade-probe',
    email: 'migration-cascade-probe@example.com',
    realmId: realm.id,
}));
await authenticatorRepository.save(authenticatorRepository.create({
    kind: 'recovery',
    codes: '[]',
    confirmed: true,
    userId: cascadeUser.id,
    realmId: realm.id,
}));
await userRepository.delete({ id: cascadeUser.id });
check('foreign keys still cascade', await authenticatorRepository.countBy({ userId: cascadeUser.id }), 0);

await dataSource.destroy();

console.log(`[${dialect}] rebooting the application against the migrated schema`);
child = await bootApplication();
const grantAfter = await login();
check('login after migration round-trip', typeof grantAfter.access_token === 'string', true);
await stopApplication(child);

const failed = results.filter((result) => !result.ok);
console.log(`\n[${dialect}] ${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
    process.exit(1);
}
