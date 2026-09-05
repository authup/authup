/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { dockerRunCommand, renderDocker } from '../../../src/targets/docker.ts';
import type { Answers } from '../../../src/types.ts';

const VERSION = '1.0.0-beta.64';

function buildAnswers(overrides: Partial<Answers> = {}): Answers {
    return {
        target: 'docker',
        publicUrl: 'https://auth.example.com',
        db: {
            type: 'postgres',
            bundled: false,
            host: 'db.example.com',
            port: 5432,
            username: 'authup',
            password: 'pa ss#word',
            database: 'authup',
        },
        redis: { url: 'redis://cache.example.com:6379' },
        smtp: { url: 'smtps://mailer:secret@mail.example.com:465' },
        registrationEnabled: true,
        passwordRecoveryEnabled: true,
        emailVerificationEnabled: false,
        adminPassword: 'admin pass',
        workerSplit: false,
        consoleSplit: false,
        tlsCertManager: false,
        ...overrides,
    };
}

function renderLines(overrides: Partial<Answers> = {}): string[] {
    return renderDocker(buildAnswers(overrides), VERSION)['authup.env'].split('\n');
}

describe('renderDocker', () => {
    it('should write authup.env only', () => {
        expect(Object.keys(renderDocker(buildAnswers(), VERSION))).toEqual(['authup.env']);
    });

    it('should pin the image to the version and comment the run command', () => {
        const command = dockerRunCommand(VERSION, 3000);
        expect(command).toContain(`authup/authup:${VERSION}`);
        expect(command).toContain('--env-file authup.env');
        expect(command).not.toContain('latest');

        const content = renderDocker(buildAnswers(), VERSION)['authup.env'];
        expect(content).toContain(`# ${command}`);
        expect(content).not.toContain('latest');
    });

    it('should write every variable as KEY=value', () => {
        const lines = renderLines();

        expect(lines).toEqual(expect.arrayContaining([
            'PUBLIC_URL=https://auth.example.com',
            'DB_TYPE=postgres',
            'DB_HOST=db.example.com',
            'DB_PORT=5432',
            'DB_USERNAME=authup',
            'DB_PASSWORD=pa ss#word',
            'DB_DATABASE=authup',
            'REDIS=redis://cache.example.com:6379',
            'SMTP=smtps://mailer:secret@mail.example.com:465',
            'REGISTRATION_ENABLED=true',
            'PASSWORD_RECOVERY_ENABLED=true',
            'USER_ADMIN_PASSWORD=admin pass',
        ]));
    });

    it('should not quote a value carrying a space', () => {
        const lines = renderLines();

        expect(lines).toContain('DB_PASSWORD=pa ss#word');
        expect(lines).toContain('USER_ADMIN_PASSWORD=admin pass');
        expect(lines.some((line) => /^[A-Z_]+=["']/.test(line))).toBeFalsy();
    });

    it('should treat a bundled database as external', () => {
        const lines = renderLines({
            db: {
                type: 'mysql',
                bundled: true,
                host: 'mysql.example.com',
                port: 3306,
                username: 'root',
                password: 'secret',
                database: 'authup',
            },
        });

        expect(lines).toContain('DB_TYPE=mysql');
        expect(lines).toContain('DB_HOST=mysql.example.com');
        expect(lines).toContain('DB_PORT=3306');
    });

    it('should omit redis, smtp and the feature flags when they are off', () => {
        const lines = renderLines({
            redis: false,
            smtp: false,
            registrationEnabled: false,
            passwordRecoveryEnabled: false,
            emailVerificationEnabled: false,
        });

        expect(lines.some((line) => line.startsWith('REDIS='))).toBeFalsy();
        expect(lines.some((line) => line.startsWith('SMTP='))).toBeFalsy();
        expect(lines.some((line) => line.startsWith('REGISTRATION_ENABLED='))).toBeFalsy();
        expect(lines.some((line) => line.startsWith('PASSWORD_RECOVERY_ENABLED='))).toBeFalsy();
    });

    it('should refuse sqlite', () => {
        expect(() => renderDocker(buildAnswers({ db: { type: 'better-sqlite3' } }), VERSION)).toThrow(/sqlite/);
    });

    it('should refuse a split', () => {
        expect(() => renderDocker(buildAnswers({ workerSplit: true }), VERSION)).toThrow(/split/);
        expect(() => renderDocker(buildAnswers({ consoleSplit: true }), VERSION)).toThrow(/split/);
    });

    it('should publish the port the public url dials and run detached with a restart policy', () => {
        expect(dockerRunCommand(VERSION, 8080)).toEqual(`docker run -d --name authup --restart unless-stopped --env-file authup.env -p 8080:3000 authup/authup:${VERSION} start`);
        expect(renderLines({ publicUrl: 'http://localhost:8080' })).toContain(`# ${dockerRunCommand(VERSION, 8080)}`);
        expect(renderLines()).toContain(`# ${dockerRunCommand(VERSION, 3000)}`);
    });

    it('should trust the proxy in front of https and none for a directly dialed port', () => {
        expect(renderLines()).toContain('TRUST_PROXY=1');
        expect(renderLines({ publicUrl: 'http://localhost:8080' })).toContain('TRUST_PROXY=false');
    });

    it('should emit email verification only when on and keep the placeholders as comments', () => {
        expect(renderLines({ emailVerificationEnabled: true })).toContain('EMAIL_VERIFICATION_ENABLED=true');
        expect(renderLines().some((line) => line.startsWith('EMAIL_VERIFICATION_ENABLED'))).toBe(false);

        const lines = renderLines();
        expect(lines).toContain('# TRUSTED_ORIGINS=https://app.example.com');
        expect(lines).toContain('# SECRETS_ENCRYPTION_KEY=<base64 32 bytes>');
        expect(lines.some((line) => line.startsWith('TRUSTED_ORIGINS=') || line.startsWith('SECRETS_ENCRYPTION_KEY='))).toBe(false);
    });
});
