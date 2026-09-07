/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { SECRET_FILES } from '../../src/constants.ts';
import { RENDERERS } from '../../src/targets/index.ts';
import type { Answers, Target } from '../../src/types.ts';

// `src/index.ts` writes the files SECRET_FILES names with mode 0600, which is a list rather than a property of the
// content. This holds the renderers to it: a file carrying an answered secret and missing from the list would be
// written world-readable, and the wizard would have leaked a password without any test noticing.
const ADMIN_PASSWORD = 'marker-admin-password';
const DB_PASSWORD = 'marker-db-password';
const SMTP_URL = 'smtps://user:marker-smtp-password@mail.example.com:465';

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
            password: DB_PASSWORD,
            database: 'authup',
        },
        redis: false,
        smtp: { url: SMTP_URL },
        registrationEnabled: true,
        passwordRecoveryEnabled: true,
        emailVerificationEnabled: true,
        adminPassword: ADMIN_PASSWORD,
        workerSplit: false,
        consoleSplit: false,
        tlsCertManager: false,
        ...overrides,
    };
}

const MATRIX: Record<string, Partial<Answers>> = {
    'compose, bundled database': { target: 'compose' },
    'compose, console split': {
        target: 'compose',
        consoleSplit: true,
        redis: { url: 'redis://redis:6379' },
    },
    'compose, external database': {
        target: 'compose',
        db: {
            type: 'mysql', 
            bundled: false, 
            host: 'db.internal', 
            port: 3306, 
            username: 'authup', 
            password: DB_PASSWORD, 
            database: 'authup',
        },
    },
    'helm': { target: 'helm' },
    'docker run': {
        target: 'docker',
        db: {
            type: 'postgres', 
            bundled: false, 
            host: 'db.internal', 
            port: 5432, 
            username: 'authup', 
            password: DB_PASSWORD, 
            database: 'authup',
        },
    },
    'bare metal': {
        target: 'bare-metal',
        db: {
            type: 'postgres', 
            bundled: false, 
            host: 'db.internal', 
            port: 5432, 
            username: 'authup', 
            password: DB_PASSWORD, 
            database: 'authup',
        },
    },
    'bare metal, sqlite': { target: 'bare-metal', db: { type: 'better-sqlite3' } },
};

describe('the files a secret may land in', () => {
    for (const [name, overrides] of Object.entries(MATRIX)) {
        it(`should keep every answered secret inside SECRET_FILES for ${name}`, () => {
            const answers = buildAnswers(overrides);
            const rendered = RENDERERS[answers.target as Target](answers, '1.0.0-beta.64');
            const leaking = Object.entries(rendered)
                .filter(([, content]) => [ADMIN_PASSWORD, DB_PASSWORD, SMTP_URL].some((secret) => content.includes(secret)))
                .map(([file]) => file)
                .filter((file) => !SECRET_FILES.has(file));

            expect(leaking, `written world-readable: ${leaking.join(', ')}`).toEqual([]);
        });
    }

    it('should name only files a target actually writes', () => {
        const written = new Set<string>();
        for (const overrides of Object.values(MATRIX)) {
            const answers = buildAnswers(overrides);
            for (const file of Object.keys(RENDERERS[answers.target as Target](answers, '1.0.0-beta.64'))) {
                written.add(file);
            }
        }

        for (const file of SECRET_FILES) {
            expect(written, `SECRET_FILES names ${file}, which no target writes`).toContain(file);
        }
    });
});
