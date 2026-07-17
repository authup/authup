/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { CamelCaseAttributes1784289540000 as MySQLMigration } from '../../../../src/adapters/database/migrations/mysql/1784289540000-CamelCaseAttributes.ts';
import { CamelCaseAttributes1784289540000 as PostgresMigration } from '../../../../src/adapters/database/migrations/postgres/1784289540000-CamelCaseAttributes.ts';

type QueryCall = {
    query: string,
    parameters: unknown[] | undefined,
};

function createQueryRunner(distinctValues: string[]): { queryRunner: QueryRunner, calls: QueryCall[] } {
    const calls : QueryCall[] = [];
    const queryRunner = {
        async query(query: string, parameters?: unknown[]) {
            calls.push({ query, parameters });
            if (query.includes('SELECT DISTINCT')) {
                return distinctValues.map((value) => ({ value }));
            }

            return undefined;
        },
    } as unknown as QueryRunner;

    return { queryRunner, calls };
}

const RENAMED_TABLES = [
    'auth_identity_provider_attributes',
    'auth_identity_provider_attribute_mappings',
    'auth_user_attributes',
];

describe.each([
    ['mysql', new MySQLMigration()],
    ['postgres', new PostgresMigration()],
])('%s plan 073 migration query coverage', (_dialect, migration) => {
    it('rewrites every renamed table, collision-delete before update, skipping unchanged keys', async () => {
        const { queryRunner, calls } = createQueryRunner(['display_name', 'scope']);

        await migration.up(queryRunner);

        for (const table of RENAMED_TABLES) {
            expect(calls.some((call) => call.query.includes('SELECT DISTINCT') && call.query.includes(table))).toBe(true);
        }

        const deleteIndex = calls.findIndex((call) => call.query.includes('DELETE') &&
            call.parameters?.[0] === 'display_name' && call.parameters?.[1] === 'displayName');
        const updateIndex = calls.findIndex((call) => call.query.includes('UPDATE') &&
            call.parameters?.[0] === 'displayName' && call.parameters?.[1] === 'display_name');

        expect(deleteIndex).toBeGreaterThanOrEqual(0);
        expect(updateIndex).toBeGreaterThan(deleteIndex);

        // an unchanged key issues no write, and no policy table is touched
        expect(calls.some((call) => (call.parameters ?? []).includes('scope'))).toBe(false);
        expect(calls.some((call) => call.query.includes('auth_policy_attributes'))).toBe(false);
    });

    it('reverses the transform on down', async () => {
        const { queryRunner, calls } = createQueryRunner(['displayName']);

        await migration.down(queryRunner);

        expect(calls.some((call) => call.query.includes('UPDATE') &&
            call.parameters?.[0] === 'display_name' && call.parameters?.[1] === 'displayName')).toBe(true);
    });
});
