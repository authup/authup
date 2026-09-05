/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EnvironmentVariable, SCHEMA } from '@authup/server-config';
import { findUnknownSchemaPaths } from '@authup/server-config-kit';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { RENDERERS } from '../../src/targets/index.ts';
import type { Answers, Database } from '../../src/types.ts';

const VERSION = '1.0.0-beta.64';

// typeorm-extension reads the DB_* names outside the registry; the rest belong to the bundled compose services.
const KNOWN_ENV_NAMES = new Set<string>([
    ...Object.values(EnvironmentVariable),
    'DB_TYPE',
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_ROOT_PASSWORD',
    'MYSQL_DATABASE',
]);

// .env / authup.env lines are KEY=value; a compose environment entry is `- "KEY=value"`.
const ENV_FILES = new Set(['.env', 'authup.env', 'docker-compose.yml']);

function collectEnvNames(content: string): string[] {
    return content
        .split('\n')
        .map((line) => /^(?:\s*-\s*"?)?([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
        .filter((name): name is string => name !== undefined);
}

function isUnknownEnvName(name: string): boolean {
    return !KNOWN_ENV_NAMES.has(name);
}

function serverDatabase(type: 'postgres' | 'mysql', bundled: boolean): Database {
    return {
        type,
        bundled,
        host: bundled ? type : 'db.example.com',
        port: type === 'postgres' ? 5432 : 3306,
        username: 'authup',
        password: 'db-secret',
        database: 'authup',
    };
}

function buildAnswers(overrides: Partial<Answers>): Answers {
    return {
        target: 'compose',
        publicUrl: 'https://auth.example.com',
        db: serverDatabase('postgres', true),
        redis: false,
        smtp: false,
        registrationEnabled: false,
        passwordRecoveryEnabled: false,
        adminPassword: 'not-the-default',
        workerSplit: false,
        consoleSplit: false,
        ...overrides,
    };
}

const MATRIX: Record<string, Answers> = {
    'compose, bundled postgres, every feature, both splits': buildAnswers({
        redis: { url: 'redis://redis:6379' },
        smtp: { url: 'smtps://mailer:secret@mail.example.com:465' },
        registrationEnabled: true,
        passwordRecoveryEnabled: true,
        workerSplit: true,
        consoleSplit: true,
    }),
    'compose, external mysql': buildAnswers({ db: serverDatabase('mysql', false) }),
    'docker, external postgres': buildAnswers({
        target: 'docker',
        db: serverDatabase('postgres', false),
        redis: { url: 'redis://cache.example.com:6379' },
        smtp: { url: 'smtp://mailer:secret@mail.example.com:587' },
        registrationEnabled: true,
        passwordRecoveryEnabled: true,
    }),
    'helm, bundled mysql, worker split': buildAnswers({
        target: 'helm',
        db: serverDatabase('mysql', true),
        redis: { url: 'redis://redis:6379' },
        workerSplit: true,
    }),
    'helm, external postgres': buildAnswers({
        target: 'helm',
        db: serverDatabase('postgres', false),
    }),
    'bare-metal, sqlite': buildAnswers({
        target: 'bare-metal',
        db: { type: 'better-sqlite3' },
    }),
    'bare-metal, postgres with smtp': buildAnswers({
        target: 'bare-metal',
        db: serverDatabase('postgres', false),
        redis: { url: 'redis://127.0.0.1:6379' },
        smtp: { url: 'smtps://mailer:secret@mail.example.com:465' },
        registrationEnabled: true,
        passwordRecoveryEnabled: true,
    }),
};

const RENDERED = Object.entries(MATRIX)
    .map(([name, answers]) => [name, RENDERERS[answers.target](answers, VERSION)] as const);

// helm values.yaml is deliberately not checked: its keys track the chart repository, not this one.
describe('drift', () => {
    it('should emit only authup.yml keys the schema declares', () => {
        const configs = RENDERED
            .filter(([, files]) => 'authup.yml' in files);
        expect(configs.length).toBeGreaterThan(0);

        for (const [name, files] of configs) {
            expect(findUnknownSchemaPaths(parse(files['authup.yml']), SCHEMA), `authup.yml of ${name}`).toEqual([]);
        }
    });

    it('should emit only environment names the schema, typeorm-extension or a bundled service reads', () => {
        for (const [name, files] of RENDERED) {
            for (const [file, content] of Object.entries(files)) {
                if (!ENV_FILES.has(file)) {
                    continue;
                }

                const names = collectEnvNames(content);
                expect(names.length, `${file} of ${name}`).toBeGreaterThan(0);
                expect(names.filter(isUnknownEnvName), `${file} of ${name}`).toEqual([]);
            }
        }
    });

    it('should report a retired key through the same predicates the rendered files pass', () => {
        expect(findUnknownSchemaPaths({ core: { retiredKey: true } }, SCHEMA)).toEqual(['core.retiredKey']);

        expect(collectEnvNames('environment:\n  - "RETIRED_KEY=1"\nRETIRED_ENV=2\n# NOT_A_KEY=3\n').filter(isUnknownEnvName))
            .toEqual(['RETIRED_KEY', 'RETIRED_ENV']);
    });
});
