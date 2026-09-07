/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describeExposure, trustProxyValue } from '../deployment.ts';
import type { Answers, Rendered } from '../types.ts';

export function dockerRunCommand(version: string, hostPort: number): string {
    return `docker run -d --name authup --restart unless-stopped --env-file authup.env -p ${hostPort}:3000 authup/authup:${version} start`;
}

export function renderDocker(answers: Answers, version: string): Rendered {
    if (answers.db.type === 'better-sqlite3') {
        throw new Error('The docker image runs in production mode and refuses sqlite: configure a postgres or mysql database.');
    }

    if (answers.workerSplit || answers.consoleSplit) {
        throw new Error('The docker run target is one container: a worker or console split needs the compose or helm target.');
    }

    const exposure = describeExposure(answers.publicUrl);

    // `docker run --env-file` reads KEY=value verbatim and does no quote handling, so values are written raw rather than through quoteEnv.
    const lines = [
        `PUBLIC_URL=${answers.publicUrl}`,
        '# The proxies in front whose X-Forwarded-For is trusted, or false; authup trusts every hop by default.',
        `TRUST_PROXY=${trustProxyValue(exposure)}`,
        `DB_TYPE=${answers.db.type}`,
        `DB_HOST=${answers.db.host}`,
        `DB_PORT=${answers.db.port}`,
        `DB_USERNAME=${answers.db.username}`,
        `DB_PASSWORD=${answers.db.password}`,
        `DB_DATABASE=${answers.db.database}`,
    ];

    if (answers.redis) {
        lines.push(`REDIS=${answers.redis.url}`);
    }

    if (answers.smtp) {
        lines.push(`SMTP=${answers.smtp.url}`);
    }

    if (answers.registrationEnabled) {
        lines.push('REGISTRATION_ENABLED=true');
    }

    if (answers.passwordRecoveryEnabled) {
        lines.push('PASSWORD_RECOVERY_ENABLED=true');
    }

    if (answers.emailVerificationEnabled) {
        lines.push('EMAIL_VERIFICATION_ENABLED=true');
    }

    lines.push(
        `USER_ADMIN_PASSWORD=${answers.adminPassword}`,
        '# Every downstream application origin, comma-separated; each may obtain a full-permission token.',
        '# TRUSTED_ORIGINS=https://app.example.com',
        '# Wraps the realm key store at rest (base64, 32 bytes). Write-once: back it up.',
        '# SECRETS_ENCRYPTION_KEY=<base64 32 bytes>',
    );

    return {
        'authup.env': [
            '# Environment of the authup container. It holds secrets: keep it out of version control.',
            `# ${dockerRunCommand(version, exposure.hostPort)}`,
            '# The database must exist already; the image runs in production mode and refuses sqlite.',
            '# A configuration file or a provisioning directory is mounted with',
            '# -v ./authup.yml:/etc/authup/authup.yml:ro -v ./provisioning:/etc/authup/provisioning:ro',
            '# https://authup.org/guide/deployment/docker',
            ...lines,
            '',
        ].join('\n'),
    };
}
