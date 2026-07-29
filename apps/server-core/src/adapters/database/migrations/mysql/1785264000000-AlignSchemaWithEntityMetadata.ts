/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
    changeColumnType,
    renameForeignKey,
    renameIndex,
    withForeignKeyChecksDisabled,
} from 'typeorm-extension';
import {
    FOREIGN_KEY_RENAMES,
    INDEX_RENAMES,
    MYSQL_COLUMN_TYPE_CHANGES,
    invertColumnTypeChanges,
    invertRenames,
} from '../helpers/schema-alignment.ts';

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
 * (MysqlDriver.getColumnLength) - a plain `type: 'uuid'` column falls
 * through to the generic varchar default of 255, which is what every
 * earlier table got. varchar(36) holds a uuid perfectly well; the
 * problem is that the model and the schema disagreed, so
 * `migration:generate` emitted `DROP COLUMN auth_events.id` - a
 * data-destroying statement that reads as routine in review.
 *
 * Postgres has a native uuid type and needs the renames only.
 *
 * Each helper is a no-op when its target state is already in place, so
 * the migration passes over a schema that already matches and resumes
 * after an interrupted attempt, which matters because MySQL commits
 * each DDL statement regardless of the surrounding transaction. The
 * column change is an in-place MODIFY COLUMN, so the values survive.
 * The foreign key checks stay disabled throughout: every constraint is
 * recreated exactly as it already existed, so re-validating it would
 * only add a table scan and a failure mode for rows that a past import
 * inserted with the checks off.
 */
export class AlignSchemaWithEntityMetadata1785264000000 implements MigrationInterface {
    name = 'AlignSchemaWithEntityMetadata1785264000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await withForeignKeyChecksDisabled(queryRunner, async () => {
            for (const rename of INDEX_RENAMES) {
                await renameIndex(queryRunner, rename);
            }

            for (const rename of FOREIGN_KEY_RENAMES) {
                await renameForeignKey(queryRunner, rename);
            }

            for (const change of MYSQL_COLUMN_TYPE_CHANGES) {
                await changeColumnType(queryRunner, change);
            }
        });
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await withForeignKeyChecksDisabled(queryRunner, async () => {
            for (const change of invertColumnTypeChanges(MYSQL_COLUMN_TYPE_CHANGES)) {
                await changeColumnType(queryRunner, change);
            }

            for (const rename of invertRenames(FOREIGN_KEY_RENAMES)) {
                await renameForeignKey(queryRunner, rename);
            }

            for (const rename of invertRenames(INDEX_RENAMES)) {
                await renameIndex(queryRunner, rename);
            }
        });
    }
}
