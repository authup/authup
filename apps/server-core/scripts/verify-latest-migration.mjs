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
    IdentityProviderAccountEntity,
    IdentityProviderEntity,
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

const describeDifference = (actual, expected) => {
    if (
        actual === null || expected === null ||
        typeof actual !== 'object' || typeof expected !== 'object'
    ) {
        return `got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`;
    }

    const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])];
    const differing = keys.filter((key) => JSON.stringify(actual[key]) !== JSON.stringify(expected[key]));

    return differing
        .map((key) => `${key}: ${JSON.stringify(actual[key])} (was ${JSON.stringify(expected[key])})`)
        .join(', ');
};

const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ ok, label });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  ${describeDifference(actual, expected)}`}`);
};

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function bootApplication(env = {}) {
    const child = spawn('node', ['dist/cli/index.mjs', 'start'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: `${port}`,
            HOST: '127.0.0.1',
            USER_ADMIN_PASSWORD: adminPassword,
            PUBLIC_URL: `http://127.0.0.1:${port}`,
            ...env,
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

// Cleanup cannot sit at the end of the happy path. Any check can exit,
// and a query, a boot or a migration operation can throw, which would
// leave the child holding its port and the pool holding its connections
// - and the next run then fails to bind, reporting something unrelated.
let child;
let dataSource;

async function cleanup() {
    if (child) {
        const running = child;
        child = undefined;
        await stopApplication(running).catch(() => {});
    }

    if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy().catch(() => {});
    }
}

for (const event of ['uncaughtException', 'unhandledRejection']) {
    process.on(event, async (error) => {
        console.error(error);
        await cleanup();
        process.exit(1);
    });
}

console.log(`[${dialect}] booting the application to populate the schema`);
child = await bootApplication();
const grant = await login();
check('login before migration round-trip', typeof grant.access_token === 'string', true);
await stopApplication(child);

dataSource = new DataSource({ ...options, logging: false });
await dataSource.initialize();

const realm = await dataSource.getRepository(RealmEntity).findOneByOrFail({ name: 'master' });
const client = await dataSource.getRepository(ClientEntity).findOneByOrFail({ name: 'admin-console' });

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

const providerRepository = dataSource.getRepository(IdentityProviderEntity);
const provider = await providerRepository.save(providerRepository.create({
    name: 'migration-probe-provider',
    protocol: 'oauth2',
    realmId: realm.id,
}));

const accountRepository = dataSource.getRepository(IdentityProviderAccountEntity);
await accountRepository.save(accountRepository.create({
    providerId: provider.id,
    providerRealmId: realm.id,
    providerUserId: 'migration-probe-external',
    userId: probeUser.id,
    userRealmId: realm.id,
}));

const TABLES = [
    'auth_realms',
    'auth_identity_providers',
    'auth_identity_provider_accounts',
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

/**
 * Per column, how many rows hold a value.
 *
 * Row counts alone would not notice a column that lost its contents:
 * a type change implemented as DROP COLUMN plus ADD COLUMN keeps every
 * row and empties one column, which is exactly the failure mode a
 * migration touching column types has to be held against.
 */
const values = async () => {
    const out = {};

    for (const table of TABLES) {
        const columns = await dataSource.query(
            dialect === 'postgres' ?
                'SELECT column_name AS name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema() ORDER BY column_name' :
                'SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE() ORDER BY COLUMN_NAME',
            [table],
        );

        const projection = columns
            .map((column) => `COUNT(${quote(column.name)}) AS ${quote(`c_${column.name}`)}`)
            .join(', ');

        const [row] = await dataSource.query(`SELECT ${projection} FROM ${quote(table)}`);

        for (const column of columns) {
            out[`${table}.${column.name}`] = Number(row[`c_${column.name}`]);
        }
    }

    return out;
};

const before = await snapshot();
const valuesBefore = await values();
console.log(`[${dialect}] populated: ${JSON.stringify(before)}`);
check('every asserted table holds rows', TABLES.every((table) => before[table] > 0), true);
check('no drift after the full chain', await drift(), 0);

await dataSource.undoLastMigration({ transaction: options.migrationsTransactionMode });
check('row counts unchanged after revert', await snapshot(), before);

/**
 * Columns the reverted migration itself added exist only on its side of
 * the boundary: the revert drops them together with their values, and the
 * re-run re-adds them empty. That is the migration's contract, not data
 * loss, so they are exempt from the value comparison - which keeps
 * guarding every pre-existing column against a type change implemented
 * as DROP plus ADD.
 *
 * Columns the migration dropped are the mirror image: the revert re-adds
 * them empty, so they exist only after the revert, and the re-run has to
 * drop them again. They are exempt the same way, from the other side.
 */
const valuesAfterRevert = await values();
const addedColumns = new Set(Object.keys(valuesBefore).filter((column) => !(column in valuesAfterRevert)));
const droppedColumns = new Set(Object.keys(valuesAfterRevert).filter((column) => !(column in valuesBefore)));
const withoutAddedColumns = (snapshotValues) => Object.fromEntries(
    Object.entries(snapshotValues).filter(([column]) => !addedColumns.has(column)),
);
const withoutDroppedColumns = (snapshotValues) => Object.fromEntries(
    Object.entries(snapshotValues).filter(([column]) => !droppedColumns.has(column)),
);
check('column values unchanged after revert', withoutDroppedColumns(valuesAfterRevert), withoutAddedColumns(valuesBefore));

await dataSource.runMigrations({ transaction: options.migrationsTransactionMode });
check('row counts unchanged after re-run', await snapshot(), before);
const valuesAfterRerun = await values();
check('column values unchanged after re-run', withoutAddedColumns(valuesAfterRerun), withoutAddedColumns(valuesBefore));
check('re-run restores the added columns', [...addedColumns].every((column) => column in valuesAfterRerun), true);
check('re-run drops the dropped columns again', [...droppedColumns].every((column) => !(column in valuesAfterRerun)), true);
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

// a second user, so the rejection can only come from the
// (provider_user_id, provider_id) index, not from (provider_id, user_id)
const duplicateUser = await userRepository.save(userRepository.create({
    name: 'migration-duplicate-probe',
    email: 'migration-duplicate-probe@example.com',
    realmId: realm.id,
}));
let duplicateRejected = false;
try {
    await accountRepository.insert(accountRepository.create({
        providerId: provider.id,
        providerRealmId: realm.id,
        providerUserId: 'migration-probe-external',
        userId: duplicateUser.id,
        userRealmId: realm.id,
    }));
} catch {
    duplicateRejected = true;
}
check('one external identity links to one user', duplicateRejected, true);

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

/**
 * MIGRATION_ENABLED=false is what an api replica or a worker runs once a
 * separate process owns the schema. The boot then verifies instead of
 * migrating, and this is the only place that verification meets a genuinely
 * migrated database: the unit suite builds its schemas with synchronize(),
 * which records no migrations table, so every migration would read as
 * pending there.
 */
console.log(`[${dialect}] rebooting with boot-time migration disabled`);
child = await bootApplication({ MIGRATION_ENABLED: 'false' });
const grantWithoutMigration = await login();
check('login with boot-time migration disabled', typeof grantWithoutMigration.access_token === 'string', true);
await stopApplication(child);

const failed = results.filter((result) => !result.ok);
console.log(`\n[${dialect}] ${results.length - failed.length}/${results.length} checks passed`);

await cleanup();

if (failed.length > 0) {
    process.exit(1);
}
