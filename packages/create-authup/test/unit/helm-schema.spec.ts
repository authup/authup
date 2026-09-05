/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { renderHelm } from '../../src/targets/helm.ts';
import type { Answers } from '../../src/types.ts';

// The offline guard against chart drift: test/fixtures/helm-values.schema.json and helm-values.yaml are the chart's own
// values.schema.json and default values.yaml, vendored from authup/helm (branch feat/beta64-topology, PR #29, commit
// 97be077, 2026-09-05), and every values.yaml
// the wizard writes must validate against it. What it cannot cover is the chart's validations.yaml (cross-field rules
// such as the origin-root requirement of a console split); a CI job rendering this matrix with `helm template` against
// the live chart, and refreshing the fixture from it, is the follow-up.
const schema = JSON.parse(readFileSync(new URL('../fixtures/helm-values.schema.json', import.meta.url), 'utf8'));
// helm validates the MERGED values (the chart's values.yaml under the operator's file), and the schema declares every
// default key as required, so a partial values.yaml is merged onto the vendored defaults first, exactly as helm does.
const defaults = parse(readFileSync(new URL('../fixtures/helm-values.yaml', import.meta.url), 'utf8'));
const ajv = new Ajv({
    strict: false, 
    allErrors: true, 
    validateFormats: false, 
});
const validate = ajv.compile(schema);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function merge(base: unknown, overlay: unknown): unknown {
    if (!isRecord(base) || !isRecord(overlay)) {
        return overlay;
    }

    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(overlay)) {
        result[key] = merge(base[key], value);
    }

    return result;
}

function buildAnswers(overrides: Partial<Answers> = {}): Answers {
    return {
        target: 'helm',
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
        adminPassword: 'admin-secret',
        workerSplit: false,
        consoleSplit: false,
        tlsCertManager: false,
        ...overrides,
    };
}

const MATRIX: Record<string, Partial<Answers>> = {
    'bundled postgres': {},
    'bundled mysql with a worker split': {
        db: {
            type: 'mysql', 
            bundled: true, 
            host: 'mysql', 
            port: 3306, 
            username: 'authup', 
            password: 'db-secret', 
            database: 'authup',
        },
        workerSplit: true,
        redis: { url: 'redis://redis:6379' },
    },
    'external postgres with every feature and a console split': {
        db: {
            type: 'postgres', 
            bundled: false, 
            host: 'pg.internal', 
            port: 5432, 
            username: 'authup', 
            password: 'db-secret', 
            database: 'authup',
        },
        consoleSplit: true,
        redis: { url: 'redis://redis:6379' },
        registrationEnabled: true,
        passwordRecoveryEnabled: true,
        emailVerificationEnabled: true,
        smtp: { url: 'smtps://u:p@mail.example.com:465' },
        tlsCertManager: true,
    },
    'a plain http url': { publicUrl: 'http://auth.example.com' },
};

describe('helm values against the chart schema', () => {
    for (const [name, overrides] of Object.entries(MATRIX)) {
        it(`should validate ${name}`, () => {
            const data = merge(defaults, parse(renderHelm(buildAnswers(overrides), '1.0.0-beta.64')['values.yaml']));

            expect(validate(data), JSON.stringify(validate.errors, null, 2)).toBe(true);
        });
    }

    it('should reject a mistyped key, so the guard is live', () => {
        expect(validate(defaults)).toBe(true);
        expect(validate(merge(defaults, { server: { splitConsoles: 'yes' } }))).toBe(false);
    });
});
