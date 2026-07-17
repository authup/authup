/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { camelCase, snakeCase } from 'change-case';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rewrite every distinct property-name key in `valueColumn` through `transform`.
 * These columns hold entity property names set by authup (identity-provider
 * attribute keys / targets, user-attribute names), so a blanket transform is
 * correct. The unique `(owner, value)` index means a rename can collide with an
 * already-migrated row; the source duplicate is removed first to keep the
 * update constraint-safe.
 */
async function renameKeys(
    queryRunner: QueryRunner,
    table: string,
    ownerColumn: string,
    valueColumn: string,
    transform: (value: string) => string,
): Promise<void> {
    const rows: { value: string }[] = await queryRunner.query(
        `SELECT DISTINCT "${valueColumn}" AS "value" FROM "${table}" WHERE "${valueColumn}" IS NOT NULL`,
    );

    for (const { value } of rows) {
        const next = transform(value);
        if (next === value) {
            continue;
        }

        await queryRunner.query(
            `DELETE FROM "${table}" AS "source" USING "${table}" AS "target" ` +
            `WHERE "source"."${ownerColumn}" = "target"."${ownerColumn}" ` +
            `AND "source"."${valueColumn}" = $1 AND "target"."${valueColumn}" = $2`,
            [value, next],
        );

        await queryRunner.query(
            `UPDATE "${table}" SET "${valueColumn}" = $1 WHERE "${valueColumn}" = $2`,
            [next, value],
        );
    }
}

/**
 * Plan 073 data migration. Database identifiers remain snake_case; values which
 * encode management/entity property names move to camelCase. Built-in policy
 * data is intentionally excluded — the provisioner overwrites it on every boot.
 */
export class CamelCaseAttributes1784289540000 implements MigrationInterface {
    name = 'CamelCaseAttributes1784289540000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await renameKeys(queryRunner, 'auth_identity_provider_attributes', 'provider_id', 'name', camelCase);
        await renameKeys(queryRunner, 'auth_identity_provider_attribute_mappings', 'provider_id', 'target_name', camelCase);
        await renameKeys(queryRunner, 'auth_user_attributes', 'user_id', 'name', camelCase);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await renameKeys(queryRunner, 'auth_user_attributes', 'user_id', 'name', snakeCase);
        await renameKeys(queryRunner, 'auth_identity_provider_attribute_mappings', 'provider_id', 'target_name', snakeCase);
        await renameKeys(queryRunner, 'auth_identity_provider_attributes', 'provider_id', 'name', snakeCase);
    }
}
