/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Answers, Rendered } from '../types.ts';
import {
    escapeComposeInterpolation, 
    indent, 
    quoteComposeEnv, 
    quoteYaml,
} from '../utils.ts';

const DOCS_URL = 'https://authup.org/guide/deployment';

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
        ...block('ports', ['- "3000:3000"']),
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

    return {
        'docker-compose.yml': `${compose.join('\n')}\n`,
        '.env': `${dotenv.join('\n')}\n`,
    };
}
