/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Answers, Rendered } from '../types.ts';
import { quoteYaml } from '../utils.ts';

export const CHART_REQUIREMENT = '# The worker and the console split need the authup chart tracking authup v1.0.0-beta.64 or later.';

export const HELM_COMMANDS: string[] = [
    'helm repo add authup https://helm.authup.org',
    'helm install authup authup/authup -f values.yaml',
];

export function renderHelm(answers: Answers, _version: string): Rendered {
    const { db } = answers;
    if (db.type === 'better-sqlite3') {
        throw new Error('The helm chart needs a server database (postgres or mysql); the image refuses sqlite.');
    }

    const url = new URL(answers.publicUrl);
    const tls = url.protocol === 'https:';
    const lines: string[] = [
        `# Written by npm create authup. Install with: ${HELM_COMMANDS.join(' && ')}`,
        '# Secrets in this file (auth.adminPassword, the database password, smtp.connectionString) can move to the chart\'s existingSecret keys; see the chart README.',
        // worker.* and server.splitConsoles arrived with the chart that tracks v1.0.0-beta.64 (authup/helm PR #29); the
        // released 0.3.0 rejects both through its values schema, while a no-split document renders on either.
        ...(answers.workerSplit || answers.consoleSplit ? [CHART_REQUIREMENT] : []),
        'server:',
        `  publicUrl: ${quoteYaml(answers.publicUrl)}`,
        ...(tls && !answers.tlsCertManager ?
            [`  # TLS needs a secret named ${url.hostname}-tls in the release namespace, or set server.ingress.certManager: true.`] :
            []),
        '  ingress:',
        '    enabled: true',
        `    hostname: ${quoteYaml(url.hostname)}`,
        `    tls: ${tls}`,
        ...(tls && answers.tlsCertManager ? ['    certManager: true'] : []),
    ];

    if (answers.registrationEnabled || answers.passwordRecoveryEnabled || answers.emailVerificationEnabled) {
        lines.push('  features:');
        if (answers.registrationEnabled) {
            lines.push('    registration: true');
        }
        if (answers.passwordRecoveryEnabled) {
            lines.push('    passwordRecovery: true');
        }
        if (answers.emailVerificationEnabled) {
            lines.push('    emailVerification: true');
        }
    }

    if (answers.workerSplit) {
        lines.push('  migration:', '    enabled: true');
    }

    if (answers.consoleSplit) {
        lines.push('  splitConsoles: true');
    }

    lines.push(
        '  # Every downstream application origin; each may obtain a full-permission token.',
        '  # trustedOrigins:',
        '  #   - https://app.example.com',
        '  # An authup.yml the chart mounts, for the options that only the file can carry.',
        '  # configuration: |',
        '  #   core:',
        '  #     passwordMinLength: 12',
    );

    if (answers.workerSplit) {
        lines.push('', 'worker:', '  enabled: true');
    }

    lines.push(
        '',
        'database:',
        `  type: ${db.type}`,
        '',
    );

    // The bundled engine takes the answered password; left empty, the chart would generate one and drop the answer.
    for (const engine of ['postgresql', 'mysql'] as const) {
        const enabled = db.bundled && db.type === (engine === 'postgresql' ? 'postgres' : 'mysql');
        lines.push(`${engine}:`, `  enabled: ${enabled}`);
        if (enabled) {
            lines.push('  auth:', `    password: ${quoteYaml(db.password)}`);
        }
    }

    if (!db.bundled) {
        // The chart schema types the port as a string ("" = engine default), so a bare integer fails helm's validation.
        lines.push(
            'externalDatabase:',
            `  host: ${quoteYaml(db.host)}`,
            `  port: ${quoteYaml(String(db.port))}`,
            `  user: ${quoteYaml(db.username)}`,
            `  database: ${quoteYaml(db.database)}`,
            `  password: ${quoteYaml(db.password)}`,
        );
    }

    if (answers.redis) {
        lines.push(
            '',
            'valkey:',
            '  enabled: true',
            '# For an external Redis set valkey.enabled to false and externalRedis.url to its redis:// URL instead.',
        );
    }

    lines.push(
        '',
        'auth:',
        `  adminPassword: ${quoteYaml(answers.adminPassword)}`,
        '  # Wraps the realm key store at rest (base64, 32 bytes). Write-once: back it up.',
        '  # secretsEncryptionKey: <base64 32 bytes>',
    );

    if (answers.smtp) {
        lines.push('', 'smtp:', `  connectionString: ${quoteYaml(answers.smtp.url)}`);
    }

    return { 'values.yaml': `${lines.join('\n')}\n` };
}
