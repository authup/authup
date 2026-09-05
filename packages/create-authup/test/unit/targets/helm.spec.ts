/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CHART_REQUIREMENT, HELM_COMMANDS, renderHelm } from '../../../src/targets/helm.ts';
import type { Answers } from '../../../src/types.ts';
import { quoteYaml } from '../../../src/utils.ts';

const VERSION = '9.9.9-test';

function buildAnswers(overrides: Partial<Answers> = {}): Answers {
    return {
        target: 'helm',
        publicUrl: 'https://auth.example.com',
        db: {
            type: 'postgres',
            bundled: true,
            host: 'postgres',
            port: 5432,
            username: 'authup',
            password: 'db-secret',
            database: 'authup',
        },
        redis: false,
        smtp: false,
        registrationEnabled: false,
        passwordRecoveryEnabled: false,
        adminPassword: 'super: secret #1',
        workerSplit: false,
        consoleSplit: false,
        ...overrides,
    };
}

function render(overrides: Partial<Answers> = {}): string {
    const rendered = renderHelm(buildAnswers(overrides), VERSION);
    expect(Object.keys(rendered)).toEqual(['values.yaml']);

    return rendered['values.yaml'];
}

describe('renderHelm', () => {
    it('should never pin an image tag: the chart owns appVersion', () => {
        const output = render({
            redis: { url: 'redis://valkey:6379' },
            smtp: { url: 'smtps://mail:secret@smtp.example.com:465' },
            workerSplit: true,
            consoleSplit: true,
        });

        expect(output).not.toContain('tag');
        expect(output).not.toContain('latest');
        expect(output).not.toContain(VERSION);
        expect(output).not.toContain('authConsole');
        expect(output).not.toContain('adminConsole');
        expect(output).not.toContain('accountConsole');
    });

    it('should open with the install commands and the existingSecret note', () => {
        const output = render();

        expect(HELM_COMMANDS).toEqual([
            'helm repo add authup https://helm.authup.org',
            'helm install authup authup/authup -f values.yaml',
        ]);
        expect(output.startsWith(`# Written by npm create authup. Install with: ${HELM_COMMANDS.join(' && ')}\n`)).toBe(true);
        expect(output).toContain('existingSecret');
        expect(output).not.toContain(CHART_REQUIREMENT);
        expect(output).not.toContain('\u2014');
    });

    it('should name the chart requirement only when a split is on', () => {
        expect(render({ workerSplit: true, redis: { url: 'redis://redis:6379' } })).toContain(`${CHART_REQUIREMENT}\nserver:\n`);
        expect(render({ consoleSplit: true, redis: { url: 'redis://redis:6379' } })).toContain(CHART_REQUIREMENT);
    });

    it('should derive hostname and tls from an https url carrying a port', () => {
        const output = render({ publicUrl: 'https://auth.example.com:8443' });

        expect(output).toContain('  publicUrl: "https://auth.example.com:8443"\n');
        expect(output).toContain('  ingress:\n    enabled: true\n    hostname: "auth.example.com"\n    tls: true\n');
    });

    it('should derive tls false from an http url', () => {
        const output = render({ publicUrl: 'http://auth.example.com' });

        expect(output).toContain('    hostname: "auth.example.com"\n    tls: false\n');
    });

    it('should enable the bundled postgres and disable mysql', () => {
        const output = render();

        expect(output).toContain('database:\n  type: postgres\n');
        expect(output).toContain('postgresql:\n  enabled: true\n  auth:\n    password: "db-secret"\nmysql:\n  enabled: false\n');
        expect(output).not.toContain('\nexternalDatabase:');
    });

    it('should enable the bundled mysql and disable postgres explicitly', () => {
        const output = render({
            db: {
                type: 'mysql',
                bundled: true,
                host: 'mysql',
                port: 3306,
                username: 'authup',
                password: 'db-secret',
                database: 'authup',
            },
        });

        expect(output).toContain('database:\n  type: mysql\n');
        expect(output).toContain('postgresql:\n  enabled: false\nmysql:\n  enabled: true\n  auth:\n    password: "db-secret"\n');
        expect(output).not.toContain('postgresql:\n  enabled: false\n  auth:');
        expect(output).not.toContain('\nexternalDatabase:');
    });

    it('should disable both bundled engines and emit the external database block', () => {
        const output = render({
            db: {
                type: 'mysql',
                bundled: false,
                host: 'db.internal',
                port: 3307,
                username: 'app-user',
                password: 'p@ss: word',
                database: 'authup_prod',
            },
        });

        expect(output).toContain('database:\n  type: mysql\n');
        expect(output).toContain('postgresql:\n  enabled: false\nmysql:\n  enabled: false\n');
        expect(output).toContain([
            'externalDatabase:',
            '  host: "db.internal"',
            '  port: "3307"',
            '  user: "app-user"',
            '  database: "authup_prod"',
            '  password: "p@ss: word"',
        ].join('\n'));
    });

    it('should emit the worker split as the worker deployment plus the migration job', () => {
        const output = render({ workerSplit: true, redis: { url: 'redis://valkey:6379' } });

        expect(output).toContain('  migration:\n    enabled: true\n');
        expect(output).toContain('\nworker:\n  enabled: true\n');

        const plain = render();
        expect(plain).not.toContain('worker');
        expect(plain).not.toContain('migration');
    });

    it('should emit the console split as splitConsoles', () => {
        expect(render({ consoleSplit: true, redis: { url: 'redis://valkey:6379' } })).toContain('  splitConsoles: true\n');
        expect(render()).not.toContain('splitConsoles');
    });

    it('should enable valkey when redis is on and name the external alternative', () => {
        const output = render({ redis: { url: 'redis://valkey:6379' } });

        expect(output).toContain('\nvalkey:\n  enabled: true\n');
        expect(output).toContain('externalRedis.url');
        expect(render()).not.toContain('valkey');
    });

    it('should emit the feature flags only when enabled', () => {
        expect(render({ registrationEnabled: true, passwordRecoveryEnabled: true }))
            .toContain('  features:\n    registration: true\n    passwordRecovery: true\n');
        expect(render({ passwordRecoveryEnabled: true }))
            .toContain('  features:\n    passwordRecovery: true\n');
        expect(render()).not.toContain('features');
        expect(render()).not.toContain('registration');
    });

    it('should quote the admin password through quoteYaml', () => {
        const adminPassword = 'no: *star "quoted"';
        const output = render({ adminPassword });

        expect(output).toContain(`\nauth:\n  adminPassword: ${quoteYaml(adminPassword)}\n`);
        expect(parse(output).auth.adminPassword).toEqual(adminPassword);
    });

    it('should emit the smtp connection string only when mail is on', () => {
        const url = 'smtps://mail:sec ret@smtp.example.com:465';

        expect(render({ smtp: { url } })).toContain(`\nsmtp:\n  connectionString: ${quoteYaml(url)}\n`);
        expect(render()).not.toContain('\nsmtp:');
    });

    it('should render a document yaml parses back with every key in place', () => {
        const output = render({
            publicUrl: 'https://auth.example.com:8443',
            db: {
                type: 'postgres',
                bundled: false,
                host: 'db.internal',
                port: 5432,
                username: 'authup',
                password: 'db-secret',
                database: 'authup',
            },
            redis: { url: 'redis://valkey:6379' },
            smtp: { url: 'smtps://mail:secret@smtp.example.com:465' },
            registrationEnabled: true,
            passwordRecoveryEnabled: true,
            workerSplit: true,
            consoleSplit: true,
        });

        expect(parse(output)).toEqual({
            server: {
                publicUrl: 'https://auth.example.com:8443',
                ingress: {
                    enabled: true, 
                    hostname: 'auth.example.com', 
                    tls: true, 
                },
                features: { registration: true, passwordRecovery: true },
                migration: { enabled: true },
                splitConsoles: true,
            },
            worker: { enabled: true },
            database: { type: 'postgres' },
            postgresql: { enabled: false },
            mysql: { enabled: false },
            externalDatabase: {
                host: 'db.internal',
                port: '5432',
                user: 'authup',
                database: 'authup',
                password: 'db-secret',
            },
            valkey: { enabled: true },
            auth: { adminPassword: 'super: secret #1' },
            smtp: { connectionString: 'smtps://mail:secret@smtp.example.com:465' },
        });
    });

    it('should refuse sqlite', () => {
        expect(() => renderHelm(buildAnswers({ db: { type: 'better-sqlite3' } }), VERSION))
            .toThrow(/postgres or mysql/);
    });
});
