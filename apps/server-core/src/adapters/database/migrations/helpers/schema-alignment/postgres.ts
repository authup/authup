/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { QueryRunner } from 'typeorm';
import { assertIdentifier } from './utils.ts';
import type { ForeignKeyRename, IndexRename } from './types.ts';

async function indexExists(queryRunner: QueryRunner, name: string) : Promise<boolean> {
    const rows = await queryRunner.query(
        'SELECT 1 FROM pg_class c ' +
        'JOIN pg_namespace n ON n.oid = c.relnamespace ' +
        "WHERE c.relkind = 'i' AND c.relname = $1 AND n.nspname = ANY(current_schemas(false)) LIMIT 1",
        [name],
    );

    return rows.length > 0;
}

async function constraintExists(queryRunner: QueryRunner, table: string, name: string) : Promise<boolean> {
    const rows = await queryRunner.query(
        'SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = to_regclass($2) LIMIT 1',
        [name, table],
    );

    return rows.length > 0;
}

function warn(queryRunner: QueryRunner, message: string) : void {
    queryRunner.connection.logger.log('warn', `[schema-alignment] ${message}`, queryRunner);
}

export async function renamePostgresIndexes(
    queryRunner: QueryRunner,
    renames: IndexRename[],
) : Promise<void> {
    for (const rename of renames) {
        assertIdentifier(rename.from);
        assertIdentifier(rename.to);

        if (await indexExists(queryRunner, rename.to)) {
            continue;
        }

        if (!await indexExists(queryRunner, rename.from)) {
            warn(queryRunner, `index ${rename.from} is absent, skipping rename`);
            continue;
        }

        await queryRunner.query(`ALTER INDEX "${rename.from}" RENAME TO "${rename.to}"`);
    }
}

export async function renamePostgresForeignKeys(
    queryRunner: QueryRunner,
    renames: ForeignKeyRename[],
) : Promise<void> {
    for (const rename of renames) {
        assertIdentifier(rename.table);
        assertIdentifier(rename.from);
        assertIdentifier(rename.to);

        if (await constraintExists(queryRunner, rename.table, rename.to)) {
            continue;
        }

        if (!await constraintExists(queryRunner, rename.table, rename.from)) {
            warn(queryRunner, `constraint ${rename.table}.${rename.from} is absent, skipping rename`);
            continue;
        }

        await queryRunner.query(
            `ALTER TABLE "${rename.table}" RENAME CONSTRAINT "${rename.from}" TO "${rename.to}"`,
        );
    }
}
