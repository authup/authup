/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
    FOREIGN_KEY_RENAMES,
    INDEX_RENAMES,
    MYSQL_COLUMN_TYPE_CHANGES,
    changeMysqlColumnTypes,
    invertColumnTypeChanges,
    invertForeignKeyRenames,
    invertIndexRenames,
    renameMysqlForeignKeys,
    renameMysqlIndexes,
    withForeignKeyChecksDisabled,
} from '../helpers/schema-alignment/index.ts';

/**
 * Aligns the migrated schema with what typeorm derives from the entity
 * metadata, in two respects.
 *
 * Names: the hand-authored migrations 1783325495597 and 1783769340000
 * created their indexes and foreign keys under readable names
 * (IDX_auth_events_actor_name) while every generated migration before
 * them used typeorm's table+column hash, so the schema carried two
 * naming regimes.
 *
 * Types: the same two migrations declared uuid columns as varchar(36).
 * MySQL has no uuid type, and typeorm's mysql driver only shortens to
 * 36 for columns whose value it generates itself
 * (MysqlDriver.getColumnLength) — a plain `type: 'uuid'` column falls
 * through to the generic varchar default of 255, which is what every
 * earlier table got. varchar(36) holds a uuid perfectly well; the
 * problem is that the model and the schema disagreed, so
 * `migration:generate` emitted `DROP COLUMN auth_events.id` — a
 * data-destroying statement that reads as routine in review.
 *
 * Postgres has a native uuid type and needs the renames only.
 *
 * Every statement is guarded by an information_schema lookup: the
 * migration is a no-op on a schema that already matches and resumes
 * cleanly after an interrupted attempt, which matters because MySQL
 * commits each DDL statement regardless of the surrounding transaction.
 * Foreign key validation is disabled for the duration — each constraint
 * is recreated exactly as it already existed, so re-validating it would
 * only add a table scan and a failure mode for rows that a past import
 * inserted with checks off.
 */
export class AlignSchemaWithEntityMetadata1785264000000 implements MigrationInterface {
    name = 'AlignSchemaWithEntityMetadata1785264000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await withForeignKeyChecksDisabled(queryRunner, async () => {
            await renameMysqlIndexes(queryRunner, INDEX_RENAMES);
            await renameMysqlForeignKeys(queryRunner, FOREIGN_KEY_RENAMES);
            await changeMysqlColumnTypes(queryRunner, MYSQL_COLUMN_TYPE_CHANGES);
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await withForeignKeyChecksDisabled(queryRunner, async () => {
            await changeMysqlColumnTypes(queryRunner, invertColumnTypeChanges(MYSQL_COLUMN_TYPE_CHANGES));
            await renameMysqlForeignKeys(queryRunner, invertForeignKeyRenames(FOREIGN_KEY_RENAMES));
            await renameMysqlIndexes(queryRunner, invertIndexRenames(INDEX_RENAMES));
        });
    }
}
