/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { renderCompose } from '../../../src/targets/compose.ts';
import type { Answers } from '../../../src/types.ts';

const VERSION = '1.0.0-beta.64';

function buildAnswers(overrides: Partial<Answers> = {}): Answers {
    return {
        target: 'compose',
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
        emailVerificationEnabled: false,
        adminPassword: 'not-the-default',
        workerSplit: false,
        consoleSplit: false,
        tlsCertManager: false,
        ...overrides,
    };
}

function render(overrides: Partial<Answers> = {}) {
    const files = renderCompose(buildAnswers(overrides), VERSION);

    return { compose: files['docker-compose.yml'], env: files['.env'] };
}

// The lines of one service, from its `  name:` key up to the next key at the same indentation.
function serviceBlock(compose: string, name: string): string {
    const lines = compose.split('\n');
    const start = lines.indexOf(`  ${name}:`);
    expect(start, `service ${name}`).toBeGreaterThan(-1);

    const end = lines.findIndex((line, index) => index > start && /^ {0,2}\S/.test(line));

    return lines.slice(start, end === -1 ? undefined : end).join('\n').trimEnd();
}

describe('renderCompose', () => {
    it('should write the two files with the image tag pinned to the version', () => {
        const { compose, env } = render({
            redis: { url: 'redis://redis:6379' }, 
            workerSplit: true, 
            consoleSplit: true, 
        });

        expect(Object.keys(renderCompose(buildAnswers(), VERSION))).toEqual(['docker-compose.yml', '.env']);

        const images = compose.match(/^ +image: authup\/authup:.*$/gm);
        expect(images).toHaveLength(3);
        for (const line of images!) {
            expect(line.trim()).toEqual(`image: authup/authup:${VERSION}`);
        }
        expect(compose).not.toContain('latest');
        expect(compose).not.toMatch(/^version:/m);
        expect(compose).toMatch(/^# .*https:\/\/authup\.org\/guide\/deployment\/docker-compose$/m);
        expect(env.startsWith('# Secrets docker-compose.yml interpolates. Keep this file out of version control.\n')).toBeTruthy();
    });

    it('should bundle postgres with a volume and point authup at it', () => {
        const { compose } = render();

        expect(compose).toContain('volumes:\n  postgres_data:\n');
        expect(serviceBlock(compose, 'postgres')).toEqual([
            '  postgres:',
            '    image: postgres:17',
            '    restart: unless-stopped',
            '    volumes:',
            '      - postgres_data:/var/lib/postgresql/data',
            '    environment:',
            '      - "POSTGRES_USER=authup"',
            '      - "POSTGRES_PASSWORD=${DB_PASSWORD}"',
            '      - "POSTGRES_DB=authup"',
            '    healthcheck:',
            '      test: ["CMD", "pg_isready", "-h", "localhost", "-U", "authup", "-d", "authup"]',
            '      interval: 5s',
            '      timeout: 5s',
            '      retries: 24',
        ].join('\n'));

        const authup = serviceBlock(compose, 'authup');
        expect(authup).toContain('    depends_on:\n      postgres:\n        condition: service_healthy\n');
        expect(authup).toContain('- "DB_TYPE=postgres"');
        expect(authup).toContain('- "DB_HOST=postgres"');
        expect(authup).toContain('- "DB_PORT=5432"');
        expect(authup).toContain('- "DB_USERNAME=authup"');
        expect(authup).toContain('- "DB_PASSWORD=${DB_PASSWORD}"');
        expect(authup).toContain('- "DB_DATABASE=authup"');
        expect(authup).toMatch(/^ {4}command: start$/m);
        expect(authup).toContain('    ports:\n      - "3000:3000"\n');
    });

    it('should bundle mysql with a volume, the root password and the engine port', () => {
        const { compose } = render({
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

        expect(compose).toContain('volumes:\n  mysql_data:\n');
        expect(compose).not.toMatch(/^ {2}postgres:$/m);

        const mysql = serviceBlock(compose, 'mysql');
        expect(mysql).toContain('    image: mysql:8.4');
        expect(mysql).toContain('      - mysql_data:/var/lib/mysql');
        expect(mysql).toContain('- "MYSQL_USER=authup"');
        expect(mysql).toContain('- "MYSQL_PASSWORD=${DB_PASSWORD}"');
        expect(mysql).toContain('- "MYSQL_ROOT_PASSWORD=${DB_PASSWORD}"');
        expect(mysql).toContain('- "MYSQL_DATABASE=authup"');
        expect(mysql).toContain('      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1"]\n');

        const authup = serviceBlock(compose, 'authup');
        expect(authup).toContain('- "DB_TYPE=mysql"');
        expect(authup).toContain('- "DB_HOST=mysql"');
        expect(authup).toContain('- "DB_PORT=3306"');
        expect(authup).toContain('    depends_on:\n      mysql:\n        condition: service_healthy\n');
    });

    it('should reach an external database without a database service or a volumes block', () => {
        const { compose } = render({
            db: {
                type: 'postgres',
                bundled: false,
                host: 'db.internal',
                port: 5433,
                username: 'svc',
                password: 'db-secret',
                database: 'authup_prod',
            },
        });

        expect(compose).not.toMatch(/^volumes:/m);
        expect(compose).not.toMatch(/^ {2}postgres:$/m);
        expect(compose).not.toContain('depends_on');

        const authup = serviceBlock(compose, 'authup');
        expect(authup).toContain('- "DB_HOST=db.internal"');
        expect(authup).toContain('- "DB_PORT=5433"');
        expect(authup).toContain('- "DB_USERNAME=svc"');
        expect(authup).toContain('- "DB_DATABASE=authup_prod"');
    });

    it('should bundle redis and use the bundled url, not the answered one', () => {
        const { compose } = render({ redis: { url: 'redis://elsewhere:1234' } });

        expect(serviceBlock(compose, 'redis')).toEqual([
            '  redis:',
            '    image: redis:7',
            '    restart: unless-stopped',
        ].join('\n'));

        const authup = serviceBlock(compose, 'authup');
        expect(authup).toContain('- "REDIS=redis://redis:6379"');
        expect(authup).not.toContain('elsewhere');
        expect(authup).toContain('    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_started\n');
    });

    it('should emit neither flag nor split service without a split', () => {
        const { compose } = render();

        expect(compose).not.toContain('WORKER_ENABLED');
        expect(compose).not.toContain('MIGRATION_ENABLED');
        expect(compose).not.toContain('authup-worker');
        expect(compose).not.toContain('authup-console');
        expect(compose).not.toContain('redis');
    });

    it('should add the worker service and hand the sweeps and the migration over', () => {
        const { compose } = render({ redis: { url: 'redis://redis:6379' }, workerSplit: true });

        const authup = serviceBlock(compose, 'authup');
        expect(authup).toContain('      # the sweeps run in the worker below\n      - "WORKER_ENABLED=false"\n');
        expect(authup).toContain('      # run "docker compose run --rm authup migration run" once before starting\n      - "MIGRATION_ENABLED=false"\n');
        expect(authup).toMatch(/^ {4}command: start$/m);

        const worker = serviceBlock(compose, 'authup-worker');
        expect(worker).toContain('    command: start worker');
        expect(worker).toContain('    # the image healthcheck probes an HTTP port this process never opens\n    healthcheck:\n      disable: true\n');
        expect(worker).toContain('    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_started\n');
        expect(worker).toContain('- "DB_HOST=postgres"');
        expect(worker).toContain('- "DB_PASSWORD=${DB_PASSWORD}"');
        expect(worker).toContain('- "PUBLIC_URL=https://auth.example.com"');
        expect(worker).toContain('- "REDIS=redis://redis:6379"');
        expect(worker).not.toContain('WORKER_ENABLED');
        expect(worker).not.toContain('ports');
    });

    it('should split the consoles into their own service reaching the API on the network', () => {
        const { compose } = render({ redis: { url: 'redis://redis:6379' }, consoleSplit: true });

        const authup = serviceBlock(compose, 'authup');
        expect(authup).toMatch(/^ {4}command: start core$/m);
        expect(authup).not.toContain('WORKER_ENABLED');
        expect(authup).not.toContain('MIGRATION_ENABLED');

        const console = serviceBlock(compose, 'authup-console');
        expect(console).toContain('    command: start console');
        expect(console).toContain('- "PUBLIC_URL=https://auth.example.com"');
        expect(console).toContain('- "INTERNAL_URL=http://authup:3000"');
        expect(console).toContain('      test: ["CMD", "wget", "--spider", "--proxy", "off", "http://127.0.0.1:3020/healthy"]\n      interval: 10s\n');
        expect(console).not.toContain('DB_');
        expect(console).not.toContain('REDIS');
        expect(console).not.toContain('ports');
        expect(console).not.toContain('depends_on');

        const [preamble] = compose.split('  authup-console:');
        expect(preamble).toContain('# Two proxy rules, in this order: /console/<name>/login/start and');
        expect(preamble).toContain('https://authup.org/guide/deployment/console-replicas');
    });

    it('should keep the secrets in .env and interpolate them in the compose file', () => {
        const { compose, env } = render({ smtp: { url: 'smtp://mailer:secret@mail.example.com:587' } });

        expect(env).toEqual([
            '# Secrets docker-compose.yml interpolates. Keep this file out of version control.',
            'DB_PASSWORD=db-secret',
            'USER_ADMIN_PASSWORD=not-the-default',
            'SMTP=smtp://mailer:secret@mail.example.com:587',
            '# Wraps the realm key store at rest (base64, 32 bytes). Write-once: back it up.',
            '# SECRETS_ENCRYPTION_KEY=',
            '',
        ].join('\n'));

        expect(compose).not.toContain('not-the-default');
        expect(compose).not.toContain('db-secret');
        expect(compose).not.toContain('mail.example.com');
        expect(compose).toContain('- "USER_ADMIN_PASSWORD=${USER_ADMIN_PASSWORD}"');
        expect(compose).toContain('- "SMTP=${SMTP}"');
    });

    it('should quote secrets for the compose .env parser', () => {
        expect(render({ adminPassword: 'pa ss #word' }).env).toContain('USER_ADMIN_PASSWORD="pa ss #word"\n');
        // compose-go reads `\'` inside single quotes as an escaped quote and expands `$` inside double quotes
        expect(render({ adminPassword: 'abc\\' }).env).toContain('USER_ADMIN_PASSWORD="abc\\\\"\n');
        expect(render({ adminPassword: 'it\'s $ecret' }).env).toContain('USER_ADMIN_PASSWORD="it\'s $$ecret"\n');
    });

    it('should keep a dollar in an answered yaml value out of compose interpolation', () => {
        const { compose } = render({
            db: {
                type: 'postgres',
                bundled: false,
                host: 'db.internal',
                port: 5432,
                username: 'svc$user',
                password: 'db-secret',
                database: 'authup',
            },
        });

        expect(compose).toContain('- "DB_USERNAME=svc$$user"');
        expect(compose).toContain('- "DB_PASSWORD=${DB_PASSWORD}"');
    });

    it('should omit SMTP and the feature flags when mail is off and emit them when on', () => {
        const off = render();
        expect(off.compose).not.toContain('SMTP');
        expect(off.compose).not.toContain('REGISTRATION_ENABLED');
        expect(off.compose).not.toContain('PASSWORD_RECOVERY_ENABLED');
        expect(off.env).not.toContain('SMTP');

        const on = render({
            smtp: { url: 'smtp://mail.example.com:25' },
            registrationEnabled: true,
            passwordRecoveryEnabled: true,
        });
        expect(on.compose).toContain('- "REGISTRATION_ENABLED=true"');
        expect(on.compose).toContain('- "PASSWORD_RECOVERY_ENABLED=true"');
    });

    it('should quote every answered value placed into the yaml', () => {
        const { compose } = render({ publicUrl: 'https://auth.example.com/base' });

        expect(compose).toContain('- "PUBLIC_URL=https://auth.example.com/base"');
        expect(compose).not.toMatch(/^ +- [A-Z_]+=/m);
    });

    it('should refuse sqlite', () => {
        expect(() => renderCompose(buildAnswers({ db: { type: 'better-sqlite3' } }), VERSION))
            .toThrow(/compose target/);
    });

    it('should publish the port the public url dials and keep 3000 behind a proxy', () => {
        expect(serviceBlock(renderCompose(buildAnswers({ publicUrl: 'http://localhost:8080' }), VERSION)['docker-compose.yml'], 'authup'))
            .toContain('    ports:\n      - "8080:3000"\n');
        expect(serviceBlock(renderCompose(buildAnswers(), VERSION)['docker-compose.yml'], 'authup'))
            .toContain('    ports:\n      - "3000:3000"\n');
    });

    it('should trust the proxies the deployment knows about and none otherwise', () => {
        const trust = (overrides: Partial<Answers>) => {
            const authup = serviceBlock(renderCompose(buildAnswers(overrides), VERSION)['docker-compose.yml'], 'authup');
            const match = authup.match(/- "TRUST_PROXY=([^"]+)"/);
            expect(match).not.toBeNull();

            return match?.[1];
        };

        expect(trust({})).toEqual('1');
        expect(trust({ publicUrl: 'http://localhost:8080' })).toEqual('false');
        expect(trust({ consoleSplit: true, redis: { url: 'redis://redis:6379' } })).toEqual('2');
        expect(trust({
            publicUrl: 'http://localhost:8080', 
            consoleSplit: true, 
            redis: { url: 'redis://redis:6379' }, 
        })).toEqual('1');
    });

    it('should hand the published port to an nginx service under a console split and emit its config', () => {
        const rendered = renderCompose(buildAnswers({
            publicUrl: 'http://localhost:8080', 
            consoleSplit: true, 
            redis: { url: 'redis://redis:6379' }, 
        }), VERSION);
        const compose = rendered['docker-compose.yml'];

        expect(Object.keys(rendered)).toEqual(['docker-compose.yml', '.env', 'nginx.conf']);
        expect(serviceBlock(compose, 'authup')).not.toContain('ports:');
        const nginx = serviceBlock(compose, 'nginx');
        expect(nginx).toContain('    image: nginx:1.31-alpine\n');
        expect(nginx).toContain('    ports:\n      - "8080:80"\n');
        expect(nginx).toContain('      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro\n');
        expect(nginx).toContain('    depends_on:\n      authup:\n        condition: service_started\n      authup-console:\n        condition: service_started');

        const conf = rendered['nginx.conf'];
        expect(conf).toContain('upstream authup_api             { server authup:3000; }');
        expect(conf).toContain('upstream authup_admin_console   { server authup-console:3021; }');
        expect(conf).toContain('location = /console/admin/login/start   { proxy_pass http://authup_api; }');
        expect(conf).toContain('rewrite ^/console/account(/.*)$ $1 break;');
        expect(conf).toContain('absolute_redirect off;');
        expect(conf).not.toContain('${');

        expect(renderCompose(buildAnswers(), VERSION)['nginx.conf']).toBeUndefined();
        expect(renderCompose(buildAnswers(), VERSION)['docker-compose.yml']).not.toContain('nginx');
    });

    it('should emit email verification only when on and keep the placeholders as comments', () => {
        const on = serviceBlock(renderCompose(buildAnswers({ emailVerificationEnabled: true }), VERSION)['docker-compose.yml'], 'authup');
        expect(on).toContain('- "EMAIL_VERIFICATION_ENABLED=true"');

        const rendered = renderCompose(buildAnswers(), VERSION);
        const authup = serviceBlock(rendered['docker-compose.yml'], 'authup');
        expect(authup).not.toContain('EMAIL_VERIFICATION_ENABLED');
        expect(authup).toContain('      # - "TRUSTED_ORIGINS=https://app.example.com"\n');
        expect(authup).toContain('      # - "SECRETS_ENCRYPTION_KEY=<base64 32 bytes>"\n');
        expect(authup).toContain('    #   - ./authup.yml:/etc/authup/authup.yml:ro\n');
        expect(authup).not.toMatch(/^\s+- "(TRUSTED_ORIGINS|SECRETS_ENCRYPTION_KEY)=/m);
        expect(rendered['.env']).toContain('\n# SECRETS_ENCRYPTION_KEY=\n');
        expect(rendered['.env']).not.toMatch(/^SECRETS_ENCRYPTION_KEY=/m);
    });
});
