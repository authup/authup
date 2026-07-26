/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-targets auth_roles.client_id onto auth_clients. The column has
 * referenced auth_realms(id) since 1740991051622 — a copy-paste of the
 * realm relation on the entity (`@ManyToOne(() => RealmEntity)` on the
 * client join column), so a client-scoped role could never store an
 * actual client id. Same defect (and same fix) as the
 * auth_permissions.client_id re-target in 1766830857009; the constraint
 * name is unchanged because TypeORM derives it from the table and
 * column names, not the referenced table.
 *
 * Any surviving non-null client_id is a realm id (that is what the old
 * FK enforced) and cannot be interpreted as a client, so the reference is
 * nulled — never the role row itself: the role, its permission junctions
 * and its user assignments are legitimate, only the column value is
 * noise (and role.clientId does not scope evaluation-time permission
 * loading, so nulling widens nothing). down() restores the previous
 * auth_realms target, nulling values the old constraint would reject.
 */
export class RoleClientForeignKey1784970000000 implements MigrationInterface {
    name = 'RoleClientForeignKey1784970000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP FOREIGN KEY \`FK_8f460e65af897b9b049f582ad0e\`
        `);
        await queryRunner.query(`
            UPDATE \`auth_roles\`
            SET \`client_id\` = NULL
            WHERE \`client_id\` IS NOT NULL
                AND \`client_id\` NOT IN (SELECT \`id\` FROM \`auth_clients\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD CONSTRAINT \`FK_8f460e65af897b9b049f582ad0e\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_clients\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\` DROP FOREIGN KEY \`FK_8f460e65af897b9b049f582ad0e\`
        `);
        await queryRunner.query(`
            UPDATE \`auth_roles\`
            SET \`client_id\` = NULL
            WHERE \`client_id\` IS NOT NULL
                AND \`client_id\` NOT IN (SELECT \`id\` FROM \`auth_realms\`)
        `);
        await queryRunner.query(`
            ALTER TABLE \`auth_roles\`
            ADD CONSTRAINT \`FK_8f460e65af897b9b049f582ad0e\` FOREIGN KEY (\`client_id\`) REFERENCES \`auth_realms\`(\`id\`) ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }
}
