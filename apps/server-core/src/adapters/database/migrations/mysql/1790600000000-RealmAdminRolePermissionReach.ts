/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The built-in `realm_admin` role holds the three role-permission write
 * permissions at `own` reach, so its holder writes permission bindings of
 * its own realm's roles only and never those of a global role.
 *
 * Provisioning inserts a missing binding but never rewrites the reach of an
 * existing one, so the rows an earlier boot stamped `ownOrNull` are narrowed
 * here. Only rows still carrying `ownOrNull` are touched, which leaves a
 * reach an operator changed deliberately alone. Data only, no DDL.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

const PERMISSION_NAMES = "'role_permission_create', 'role_permission_update', 'role_permission_delete'";

function buildQuery(from: string, to: string): string {
    return `
        UPDATE auth_role_permissions
        SET realm_scope = '${to}'
        WHERE realm_scope = '${from}'
          AND role_id IN (
              SELECT id FROM auth_roles WHERE name = 'realm_admin' AND realm_id IS NULL
          )
          AND permission_id IN (
              SELECT id FROM auth_permissions
              WHERE name IN (${PERMISSION_NAMES}) AND realm_id IS NULL AND client_id IS NULL
          )
    `;
}

export class RealmAdminRolePermissionReach1790600000000 implements MigrationInterface {
    name = 'RealmAdminRolePermissionReach1790600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(buildQuery('ownOrNull', 'own'));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(buildQuery('own', 'ownOrNull'));
    }
}
