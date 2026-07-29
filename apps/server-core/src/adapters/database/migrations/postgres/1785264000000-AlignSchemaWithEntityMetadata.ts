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
    invertForeignKeyRenames,
    invertIndexRenames,
    renamePostgresForeignKeys,
    renamePostgresIndexes,
} from '../helpers/schema-alignment/index.ts';

/**
 * Aligns the migrated schema with the names typeorm derives from the
 * entity metadata. The hand-authored migrations 1783325495597 and
 * 1783769340000 created their indexes and foreign keys under readable
 * names (IDX_auth_events_actor_name) while every generated migration
 * before them used typeorm's table+column hash (IDX_ce33c3f58b...), so
 * the schema carried two naming regimes.
 *
 * The split had no runtime effect — nothing resolves an index or
 * constraint by name — but it made `migration:generate` emit a full
 * drop/recreate of all 28 constraints, which buried real defects (the
 * auth_permissions.client_id and auth_roles.client_id foreign keys both
 * pointed at the wrong table) in naming noise.
 *
 * Renames only: no table is rewritten, no row is read or written. Every
 * statement is guarded by a catalog lookup, so the migration is a no-op
 * on a schema that already carries the derived names and can be re-run
 * after an interrupted attempt.
 */
export class AlignSchemaWithEntityMetadata1785264000000 implements MigrationInterface {
    name = 'AlignSchemaWithEntityMetadata1785264000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await renamePostgresIndexes(queryRunner, INDEX_RENAMES);
        await renamePostgresForeignKeys(queryRunner, FOREIGN_KEY_RENAMES);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await renamePostgresForeignKeys(queryRunner, invertForeignKeyRenames(FOREIGN_KEY_RENAMES));
        await renamePostgresIndexes(queryRunner, invertIndexRenames(INDEX_RENAMES));
    }
}
