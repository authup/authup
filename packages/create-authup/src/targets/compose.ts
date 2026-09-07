/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describeExposure, trustProxyValue } from '../deployment.ts';
import type { Answers, Rendered } from '../types.ts';
import {
    escapeComposeInterpolation,
    indent,
    quoteComposeEnv,
    quoteYaml,
} from '../utils.ts';

const DOCS_URL = 'https://authup.org/guide/deployment';

const NGINX_CONF = `# Written by npm create authup: the console split's routing, ${DOCS_URL}/console-replicas
# TLS, if any, terminates in front of this proxy; X-Forwarded-Proto is passed through as the scheme it sees.
upstream authup_api             { server authup:3000; }
upstream authup_auth_console    { server authup-console:3020; }
upstream authup_admin_console   { server authup-console:3021; }
upstream authup_account_console { server authup-console:3022; }

server {
    listen 80;
    # nginx listens on 80 inside the container while the published port is another one: a redirect it builds itself
    # (the trailing slash it adds to /console/<name>) must stay relative or it would send the browser to port 80.
    absolute_redirect off;

    # The sign-in pair stays on the API. Exact matches, so they win over the prefix rules below.
    location = /console/admin/login/start   { proxy_pass http://authup_api; }
    location = /console/admin/callback      { proxy_pass http://authup_api; }
    location = /console/account/login/start { proxy_pass http://authup_api; }
    location = /console/account/callback    { proxy_pass http://authup_api; }

    location /console/auth/ {
        rewrite ^/console/auth(/.*)$ $1 break;
        proxy_set_header Host               $host;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_auth_console;
    }

    location /console/admin/ {
        rewrite ^/console/admin(/.*)$ $1 break;
        proxy_set_header Host               $host;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_admin_console;
    }

    location /console/account/ {
        rewrite ^/console/account(/.*)$ $1 break;
        proxy_set_header Host               $host;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_account_console;
    }

    location / {
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_api;
    }
}
`;


const ENGINES = {
    postgres: {
        image: 'postgres:17',
        port: 5432,
        dataPath: '/var/lib/postgresql/data',
    },
    mysql: {
        image: 'mysql:8.4',
        port: 3306,
        dataPath: '/var/lib/mysql',
    },
} as const;

// One list entry of a compose `environment` block; the whole KEY=value is one YAML scalar, so quoting it covers the
// value, and an operator's `$` is doubled so compose does not interpolate it away.
function env(key: string, value: string): string {
    return `- ${quoteYaml(`${key}=${escapeComposeInterpolation(value)}`)}`;
}

// The same entry carrying a deliberate `${VARIABLE}` reference into .env.
function ref(key: string, variable: string): string {
    return `- ${quoteYaml(`${key}=\${${variable}}`)}`;
}

function block(key: string, lines: string[]): string[] {
    return [`${key}:`, ...indent(lines.join('\n'), 2).split('\n')];
}

export function renderCompose(answers: Answers, version: string): Rendered {
    const { db } = answers;
    if (db.type === 'better-sqlite3') {
        throw new Error('The compose target needs a server database (postgres or mysql): the image runs in production mode and refuses sqlite.');
    }

    const image = `image: authup/authup:${version}`;
    const restart = 'restart: unless-stopped';
    const engine = ENGINES[db.type];
    const exposure = describeExposure(answers.publicUrl);

    const dbEnv = [
        env('DB_TYPE', db.type),
        env('DB_HOST', db.bundled ? db.type : db.host),
        env('DB_PORT', String(db.bundled ? engine.port : db.port)),
        env('DB_USERNAME', db.username),
        ref('DB_PASSWORD', 'DB_PASSWORD'),
        env('DB_DATABASE', db.database),
    ];
    if (answers.redis) {
        dbEnv.push(env('REDIS', 'redis://redis:6379'));
    }

    const dependsOn: string[] = [];
    if (db.bundled) {
        // The one-off `migration run` and the services would otherwise race an engine still initializing its volume.
        dependsOn.push(`${db.type}:`, '  condition: service_healthy');
    }
    if (answers.redis) {
        dependsOn.push('redis:', '  condition: service_started');
    }
    const dependsOnBlock = dependsOn.length > 0 ? block('depends_on', dependsOn) : [];

    const authupEnv = [
        env('PUBLIC_URL', answers.publicUrl),
        '# the proxies in front whose X-Forwarded-For is trusted, or false; authup trusts every hop by default',
        env('TRUST_PROXY', trustProxyValue(exposure, answers.consoleSplit)),
        ...dbEnv,
        ref('USER_ADMIN_PASSWORD', 'USER_ADMIN_PASSWORD'),
    ];
    if (answers.smtp) {
        authupEnv.push(ref('SMTP', 'SMTP'));
    }
    if (answers.registrationEnabled) {
        authupEnv.push(env('REGISTRATION_ENABLED', 'true'));
    }
    if (answers.passwordRecoveryEnabled) {
        authupEnv.push(env('PASSWORD_RECOVERY_ENABLED', 'true'));
    }
    if (answers.emailVerificationEnabled) {
        authupEnv.push(env('EMAIL_VERIFICATION_ENABLED', 'true'));
    }
    authupEnv.push(
        '# every downstream application origin, comma-separated; each may obtain a full-permission token',
        '# - "TRUSTED_ORIGINS=https://app.example.com"',
        '# wraps the realm key store at rest (base64, 32 bytes); write-once, back it up',
        '# - "SECRETS_ENCRYPTION_KEY=<base64 32 bytes>"',
    );
    // A console-only split keeps one API process, which sweeps and migrates itself like a plain `start` does.
    if (answers.workerSplit) {
        authupEnv.push(
            '# the sweeps run in the worker below',
            env('WORKER_ENABLED', 'false'),
            '# run "docker compose run --rm authup migration run" once before starting',
            env('MIGRATION_ENABLED', 'false'),
        );
    }

    const services = block('authup', [
        image,
        restart,
        // under a console split the proxy below owns the published port
        ...(answers.consoleSplit ? [] : block('ports', [`- "${exposure.hostPort}:3000"`])),
        '# a configuration file and a provisioning directory are optional; mount them under /etc/authup',
        '# volumes:',
        '#   - ./authup.yml:/etc/authup/authup.yml:ro',
        '#   - ./provisioning:/etc/authup/provisioning:ro',
        ...dependsOnBlock,
        ...block('environment', authupEnv),
        `command: ${answers.consoleSplit ? 'start core' : 'start'}`,
    ]);

    if (db.bundled) {
        const credentials = db.type === 'postgres' ?
            [
                env('POSTGRES_USER', db.username),
                ref('POSTGRES_PASSWORD', 'DB_PASSWORD'),
                env('POSTGRES_DB', db.database),
            ] :
            [
                env('MYSQL_USER', db.username),
                ref('MYSQL_PASSWORD', 'DB_PASSWORD'),
                ref('MYSQL_ROOT_PASSWORD', 'DB_PASSWORD'),
                env('MYSQL_DATABASE', db.database),
            ];

        // Both official images run a temporary, network-less server while initializing an empty volume, so a probe
        // over TCP answers only once the real server is up (pg_isready over the socket would answer too early).
        const probe = db.type === 'postgres' ?
            `test: ["CMD", "pg_isready", "-h", "localhost", "-U", ${quoteYaml(escapeComposeInterpolation(db.username))}, "-d", ${quoteYaml(escapeComposeInterpolation(db.database))}]` :
            // mysqladmin ping exits 0 whenever the server takes the connection, credentials or not
            'test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1"]';

        services.push('', ...block(db.type, [
            `image: ${engine.image}`,
            restart,
            ...block('volumes', [`- ${db.type}_data:${engine.dataPath}`]),
            ...block('environment', credentials),
            ...block('healthcheck', [probe, 'interval: 5s', 'timeout: 5s', 'retries: 24']),
        ]));
    }

    if (answers.redis) {
        services.push('', ...block('redis', ['image: redis:7', restart]));
    }

    if (answers.workerSplit) {
        services.push(
            '',
            '# one instance is enough, whatever the API scales to',
            ...block('authup-worker', [
                image,
                restart,
                ...dependsOnBlock,
                // the worker needs no url of its own; without one the CLI derives it and warns on every start
                ...block('environment', [env('PUBLIC_URL', answers.publicUrl), ...dbEnv]),
                '# the image healthcheck probes an HTTP port this process never opens',
                ...block('healthcheck', ['disable: true']),
                'command: start worker',
            ]),
        );
    }

    if (answers.consoleSplit) {
        services.push(
            '',
            '# Two proxy rules, in this order: /console/<name>/login/start and',
            '# /console/<name>/callback (admin and account) go to the authup service;',
            '# everything else under /console/** goes here, with the /console/<name>',
            `# prefix stripped. See ${DOCS_URL}/console-replicas`,
            ...block('authup-console', [
                image,
                restart,
                ...block('environment', [
                    env('PUBLIC_URL', answers.publicUrl),
                    '# the auth console renders server-side and calls the API itself: reach it on this network',
                    env('INTERNAL_URL', 'http://authup:3000'),
                ]),
                '# the image probes the API port, which this process never opens; the auth',
                '# console cannot be disabled, so it is always listening (3020 by default)',
                ...block('healthcheck', [
                    'test: ["CMD", "wget", "--spider", "--proxy", "off", "http://127.0.0.1:3020/healthy"]',
                    'interval: 10s',
                ]),
                'command: start console',
            ]),
            '',
            '# The proxy owns the published port and carries the two console routing rules (nginx.conf).',
            ...block('nginx', [
                'image: nginx:1.31-alpine',
                restart,
                ...block('ports', [`- "${exposure.hostPort}:80"`]),
                ...block('volumes', ['- ./nginx.conf:/etc/nginx/conf.d/default.conf:ro']),
                ...block('depends_on', ['authup:', '  condition: service_started', 'authup-console:', '  condition: service_started']),
            ]),
        );
    }

    const compose = [
        `# Written by npm create authup. Secrets live in .env next to this file: ${DOCS_URL}/docker-compose`,
        '',
    ];
    if (db.bundled) {
        compose.push(...block('volumes', [`${db.type}_data:`]), '');
    }
    compose.push(...block('services', services));

    const dotenv = [
        '# Secrets docker-compose.yml interpolates. Keep this file out of version control.',
        `DB_PASSWORD=${quoteComposeEnv(db.password)}`,
        `USER_ADMIN_PASSWORD=${quoteComposeEnv(answers.adminPassword)}`,
    ];
    if (answers.smtp) {
        dotenv.push(`SMTP=${quoteComposeEnv(answers.smtp.url)}`);
    }
    dotenv.push(
        '# Wraps the realm key store at rest (base64, 32 bytes). Write-once: back it up.',
        '# SECRETS_ENCRYPTION_KEY=',
    );

    return {
        'docker-compose.yml': `${compose.join('\n')}\n`,
        '.env': `${dotenv.join('\n')}\n`,
        ...(answers.consoleSplit ? { 'nginx.conf': NGINX_CONF } : {}),
    };
}
