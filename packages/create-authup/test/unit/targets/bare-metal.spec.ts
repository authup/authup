/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { renderBareMetal } from '../../../src/targets/bare-metal.ts';
import type { Answers } from '../../../src/types.ts';

const VERSION = '1.0.0-beta.64';

function buildAnswers(overrides: Partial<Answers> = {}): Answers {
    return {
        target: 'bare-metal',
        publicUrl: 'https://idp.example.com',
        db: {
            type: 'postgres',
            bundled: false,
            host: '127.0.0.1',
            port: 5432,
            username: 'authup',
            password: 'db-secret',
            database: 'authup',
        },
        redis: false,
        smtp: false,
        registrationEnabled: false,
        passwordRecoveryEnabled: false,
        adminPassword: 'admin-secret',
        workerSplit: false,
        consoleSplit: false,
        ...overrides,
    };
}

describe('renderBareMetal', () => {
    it('should pin the npm range to the package version', () => {
        const files = renderBareMetal(buildAnswers(), VERSION);
        const manifest = JSON.parse(files['package.json']);

        expect(manifest.dependencies.authup).toEqual(`^${VERSION}`);
        expect(manifest.private).toEqual(true);
        expect(manifest.scripts.start).toEqual('authup start');
        expect(files['package.json']).not.toContain('latest');
        expect(files['package.json'].endsWith('\n')).toEqual(true);
    });

    it('should start authup.yml with the schema comment and the quoted public url', () => {
        const files = renderBareMetal(buildAnswers(), VERSION);
        const [first, second] = files['authup.yml'].split('\n');

        expect(first).toEqual('# yaml-language-server: $schema=https://authup.org/schema/config.json');
        expect(second).toEqual('publicUrl: "https://idp.example.com"');
    });

    // server-core hands a `db` block to the data source AS IS and never merges DB_* over it, so a block here would
    // have booted without the password that .env holds; the whole connection therefore rides the DB_* set.
    it('should render a server database in production through the DB_* set in .env', () => {
        const files = renderBareMetal(buildAnswers(), VERSION);

        expect(files['authup.yml']).toContain('\nenv: production\n');
        expect(files['authup.yml']).not.toContain('\ndb:');
        expect(files['authup.yml']).toContain('# The database connection is the DB_* set in .env.');
        expect(files['authup.yml']).not.toContain('db-secret');
        expect(files['.env']).toContain([
            'DB_TYPE=postgres',
            'DB_HOST=127.0.0.1',
            'DB_PORT=5432',
            'DB_USERNAME=authup',
            'DB_PASSWORD=db-secret',
            'DB_DATABASE=authup',
        ].join('\n'));
    });

    it('should keep sqlite out of production and out of the db block', () => {
        const files = renderBareMetal(buildAnswers({ db: { type: 'better-sqlite3' } }), VERSION);

        expect(files['authup.yml']).not.toContain('env: production');
        expect(files['authup.yml']).not.toContain('db:');
        expect(files['authup.yml']).toContain('# db.sqlite is written into this directory.');
        expect(files['.env']).not.toContain('DB_');
    });

    it('should keep the admin password in .env and out of authup.yml', () => {
        const files = renderBareMetal(buildAnswers(), VERSION);

        expect(files['.env'].split('\n')[0]).toEqual('# Secrets. authup start reads this file from the directory it is started in. Keep it out of version control.');
        expect(files['.env']).toContain('\nUSER_ADMIN_PASSWORD=admin-secret\n');
        expect(files['authup.yml']).not.toContain('admin-secret');
    });

    it('should quote an .env value outside the safe charset', () => {
        const files = renderBareMetal(buildAnswers({ adminPassword: 'pa$$ word#1' }), VERSION);

        expect(files['.env']).toContain('\nUSER_ADMIN_PASSWORD=\'pa$$ word#1\'\n');
    });

    it('should turn smtp on in authup.yml and carry its url in .env', () => {
        const files = renderBareMetal(buildAnswers({ smtp: { url: 'smtps://user:pass@mail.example.com:465' } }), VERSION);

        expect(files['authup.yml']).toContain('\nsmtp: true\n');
        expect(files['authup.yml']).not.toContain('mail.example.com');
        expect(files['.env']).toContain('\nSMTP=smtps://user:pass@mail.example.com:465\n');
    });

    it('should omit smtp and the SMTP variable when mail is off', () => {
        const files = renderBareMetal(buildAnswers(), VERSION);

        expect(files['authup.yml']).not.toContain('smtp');
        expect(files['.env']).not.toContain('SMTP');
    });

    it('should render the redis url when redis is on', () => {
        const files = renderBareMetal(buildAnswers({ redis: { url: 'redis://127.0.0.1:6379' } }), VERSION);

        expect(files['authup.yml']).toContain('\nredis: "redis://127.0.0.1:6379"\n');
        expect(renderBareMetal(buildAnswers(), VERSION)['authup.yml']).not.toContain('redis');
    });

    it('should render the core section only for an enabled feature', () => {
        const files = renderBareMetal(buildAnswers({ registrationEnabled: true }), VERSION);

        expect(files['authup.yml']).toContain('\ncore:\n  registrationEnabled: true\n');
        expect(files['authup.yml']).not.toContain('passwordRecoveryEnabled');
        expect(renderBareMetal(buildAnswers(), VERSION)['authup.yml']).not.toContain('core:');
    });

    it('should render both feature flags when both are on', () => {
        const files = renderBareMetal(buildAnswers({ registrationEnabled: true, passwordRecoveryEnabled: true }), VERSION);

        expect(files['authup.yml']).toContain('\ncore:\n  registrationEnabled: true\n  passwordRecoveryEnabled: true\n');
    });

    it('should refuse a worker or console split', () => {
        expect(() => renderBareMetal(buildAnswers({ workerSplit: true }), VERSION)).toThrow();
        expect(() => renderBareMetal(buildAnswers({ consoleSplit: true }), VERSION)).toThrow();
    });
});
