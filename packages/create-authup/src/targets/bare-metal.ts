/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LISTEN_PORT, describeExposure, trustProxyValue } from '../deployment.ts';
import type { Answers, Rendered } from '../types.ts';
import { quoteEnv, quoteYaml } from '../utils.ts';

const SCHEMA_COMMENT = '# yaml-language-server: $schema=https://authup.org/schema/config.json';
const DATABASE_DOCS_URL = 'https://authup.org/guide/deployment/configuration-server-core-database';

export function renderBareMetal(answers: Answers, version: string): Rendered {
    if (answers.workerSplit || answers.consoleSplit) {
        throw new Error('The bare-metal target runs one process: a worker or console split is a second process under a process manager, which the wizard does not write.');
    }

    return {
        'package.json': renderPackageJson(version),
        'authup.yml': renderConfig(answers),
        '.env': renderEnv(answers),
    };
}

function renderPackageJson(version: string): string {
    const manifest = {
        name: 'authup-deployment',
        private: true,
        type: 'module',
        scripts: { start: 'authup start' },
        // exact, like the image tag the container targets write: the wizard scaffolds one release, not a range
        dependencies: { authup: version },
    };

    return `${JSON.stringify(manifest, null, 4)}\n`;
}

function renderConfig(answers: Answers): string {
    const { db } = answers;
    const lines = [
        SCHEMA_COMMENT,
        `publicUrl: ${quoteYaml(answers.publicUrl)}`,
    ];

    if (db.type === 'better-sqlite3') {
        lines.push(
            '# Production refuses sqlite, so this file keeps the development default of env.',
            `# That is fine for a local trial only: ${DATABASE_DOCS_URL}`,
            '',
            '# db.sqlite is written into this directory.',
        );
    } else {
        lines.push(
            'env: production',
            '',
            // A `db` block here would be used AS IS: server-core never merges DB_* over it, so the password could not
            // stay in .env. The whole connection rides the DB_* variables there instead (the documented env form).
            '# The database connection is the DB_* set in .env.',
        );
    }

    if (answers.redis) {
        lines.push('', `redis: ${quoteYaml(answers.redis.url)}`);
    }

    if (answers.smtp) {
        lines.push('', '# The connection URL is SMTP in .env.', 'smtp: true');
    }

    lines.push(
        '',
        '# Every downstream application origin; each may obtain a full-permission token.',
        '# trustedOrigins:',
        '#   - https://app.example.com',
    );

    // The process listens where the url says when nothing is in front; behind a proxy the default stays.
    const exposure = describeExposure(answers.publicUrl);
    lines.push(
        '',
        'core:',
        ...(exposure.hostPort !== LISTEN_PORT ? [`  port: ${exposure.hostPort}`] : []),
        '  # The proxies in front whose X-Forwarded-For is trusted, or false; authup trusts every hop by default.',
        `  trustProxy: ${trustProxyValue(exposure)}`,
        ...(answers.registrationEnabled ? ['  registrationEnabled: true'] : []),
        ...(answers.passwordRecoveryEnabled ? ['  passwordRecoveryEnabled: true'] : []),
        ...(answers.emailVerificationEnabled ? ['  emailVerificationEnabled: true'] : []),
    );

    return `${lines.join('\n')}\n`;
}

function renderEnv(answers: Answers): string {
    const lines = ['# Secrets. authup start reads this file from the directory it is started in. Keep it out of version control.'];

    const { db } = answers;
    if (db.type !== 'better-sqlite3') {
        lines.push(
            `DB_TYPE=${db.type}`,
            `DB_HOST=${quoteEnv(db.host)}`,
            `DB_PORT=${db.port}`,
            `DB_USERNAME=${quoteEnv(db.username)}`,
            `DB_PASSWORD=${quoteEnv(db.password)}`,
            `DB_DATABASE=${quoteEnv(db.database)}`,
        );
    }

    lines.push(`USER_ADMIN_PASSWORD=${quoteEnv(answers.adminPassword)}`);

    if (answers.smtp) {
        lines.push(`SMTP=${quoteEnv(answers.smtp.url)}`);
    }

    lines.push(
        '# Wraps the realm key store at rest (base64, 32 bytes). Write-once: back it up.',
        '# SECRETS_ENCRYPTION_KEY=',
    );

    return `${lines.join('\n')}\n`;
}
