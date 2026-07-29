/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { QueryRunner } from 'typeorm';
import { assertIdentifier } from './utils.ts';
import type { ColumnTypeChange, ForeignKeyRename, IndexRename } from './types.ts';

async function indexExists(queryRunner: QueryRunner, table: string, name: string) : Promise<boolean> {
    const rows = await queryRunner.query(
        'SELECT 1 FROM information_schema.STATISTICS ' +
        'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
        [table, name],
    );

    return rows.length > 0;
}

async function foreignKeyExists(queryRunner: QueryRunner, table: string, name: string) : Promise<boolean> {
    const rows = await queryRunner.query(
        'SELECT 1 FROM information_schema.TABLE_CONSTRAINTS ' +
        'WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? ' +
        "AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1",
        [table, name],
    );

    return rows.length > 0;
}

async function readColumnType(
    queryRunner: QueryRunner,
    table: string,
    column: string,
) : Promise<string | undefined> {
    const rows = await queryRunner.query(
        'SELECT COLUMN_TYPE AS type FROM information_schema.COLUMNS ' +
        'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
        [table, column],
    );

    return rows.length > 0 ? rows[0].type : undefined;
}

function warn(queryRunner: QueryRunner, message: string) : void {
    queryRunner.connection.logger.log('warn', `[schema-alignment] ${message}`, queryRunner);
}

/**
 * Runs the callback with foreign key validation disabled on this
 * connection. Recreating a constraint that already exists (and was
 * already enforcing) does not need a full re-validation scan, and a
 * legacy row that only exists because some past import ran with checks
 * off must not turn a rename into a failed boot.
 */
export async function withForeignKeyChecksDisabled(
    queryRunner: QueryRunner,
    fn: () => Promise<void>,
) : Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    try {
        await fn();
    } finally {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    }
}

export async function renameMysqlIndexes(
    queryRunner: QueryRunner,
    renames: IndexRename[],
) : Promise<void> {
    for (const rename of renames) {
        assertIdentifier(rename.table);
        assertIdentifier(rename.from);
        assertIdentifier(rename.to);

        if (await indexExists(queryRunner, rename.table, rename.to)) {
            continue;
        }

        if (!await indexExists(queryRunner, rename.table, rename.from)) {
            warn(queryRunner, `index ${rename.table}.${rename.from} is absent, skipping rename`);
            continue;
        }

        await queryRunner.query(
            `ALTER TABLE \`${rename.table}\` RENAME INDEX \`${rename.from}\` TO \`${rename.to}\``,
        );
    }
}

/**
 * MySQL cannot rename a foreign key, so each one is dropped and
 * recreated. When the constraint's column carries no explicit index,
 * MySQL auto-created a backing index under the constraint name — that
 * index survives the drop and is renamed before the new constraint is
 * added, so MySQL reuses it instead of creating a second one under the
 * new name.
 */
export async function renameMysqlForeignKeys(
    queryRunner: QueryRunner,
    renames: ForeignKeyRename[],
) : Promise<void> {
    for (const rename of renames) {
        assertIdentifier(rename.table);
        assertIdentifier(rename.column);
        assertIdentifier(rename.from);
        assertIdentifier(rename.to);
        assertIdentifier(rename.referencedTable);
        assertIdentifier(rename.referencedColumn);

        if (await foreignKeyExists(queryRunner, rename.table, rename.to)) {
            continue;
        }

        if (!await foreignKeyExists(queryRunner, rename.table, rename.from)) {
            warn(queryRunner, `foreign key ${rename.table}.${rename.from} is absent, skipping rename`);
            continue;
        }

        await queryRunner.query(
            `ALTER TABLE \`${rename.table}\` DROP FOREIGN KEY \`${rename.from}\``,
        );

        if (
            await indexExists(queryRunner, rename.table, rename.from) &&
            !await indexExists(queryRunner, rename.table, rename.to)
        ) {
            await queryRunner.query(
                `ALTER TABLE \`${rename.table}\` RENAME INDEX \`${rename.from}\` TO \`${rename.to}\``,
            );
        }

        await queryRunner.query(
            `ALTER TABLE \`${rename.table}\` ADD CONSTRAINT \`${rename.to}\` ` +
            `FOREIGN KEY (\`${rename.column}\`) ` +
            `REFERENCES \`${rename.referencedTable}\`(\`${rename.referencedColumn}\`) ` +
            `ON DELETE ${rename.onDelete} ON UPDATE ${rename.onUpdate}`,
        );
    }
}

export async function changeMysqlColumnTypes(
    queryRunner: QueryRunner,
    changes: ColumnTypeChange[],
) : Promise<void> {
    for (const change of changes) {
        assertIdentifier(change.table);
        assertIdentifier(change.column);

        const type = await readColumnType(queryRunner, change.table, change.column);
        if (typeof type === 'undefined') {
            warn(queryRunner, `column ${change.table}.${change.column} is absent, skipping type change`);
            continue;
        }

        if (type === change.to) {
            continue;
        }

        if (type !== change.from) {
            warn(
                queryRunner,
                `column ${change.table}.${change.column} is ${type}, expected ${change.from}, skipping type change`,
            );
            continue;
        }

        await queryRunner.query(
            `ALTER TABLE \`${change.table}\` MODIFY COLUMN \`${change.column}\` ` +
            `${change.to} ${change.nullable ? 'NULL' : 'NOT NULL'}`,
        );
    }
}
