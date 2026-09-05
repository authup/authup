/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Answers, Rendered } from '../types.ts';

export function dockerRunCommand(version: string): string {
    return `docker run --env-file authup.env -p 3000:3000 authup/authup:${version} start`;
}

export function renderDocker(answers: Answers, version: string): Rendered {
    if (answers.db.type === 'better-sqlite3') {
        throw new Error('The docker image runs in production mode and refuses sqlite: configure a postgres or mysql database.');
    }

    if (answers.workerSplit || answers.consoleSplit) {
        throw new Error('The docker run target is one container: a worker or console split needs the compose or helm target.');
    }

    // `docker run --env-file` reads KEY=value verbatim and does no quote handling, so values are written raw rather than through quoteEnv.
    const lines = [
        `PUBLIC_URL=${answers.publicUrl}`,
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

    lines.push(`USER_ADMIN_PASSWORD=${answers.adminPassword}`);

    return {
        'authup.env': [
            '# Environment of the authup container. It holds secrets: keep it out of version control.',
            `# ${dockerRunCommand(version)}`,
            '# The database must exist already; the image runs in production mode and refuses sqlite.',
            '# https://authup.org/guide/deployment/docker',
            ...lines,
            '',
        ].join('\n'),
    };
}
